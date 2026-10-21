import type {
  ChatRepository,
  ChatThread,
  ChatThreadMeta,
} from "@/storage/types";
import type { LLMStrategy, Message } from "./types";

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

class ControlledStream implements AsyncIterable<string> {
  private values: string[] = [];
  private waiters: Array<{
    resolve: (result: IteratorResult<string>) => void;
    reject: (reason?: unknown) => void;
  }> = [];
  private ended = false;
  private failure: unknown;

  public push(value: string): void {
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve({ value, done: false });
    else this.values.push(value);
  }

  public finish(): void {
    this.ended = true;
    this.flush();
  }

  public fail(error: unknown): void {
    this.failure = error;
    this.ended = true;
    this.flush();
  }

  public [Symbol.asyncIterator](): AsyncIterator<string> {
    return {
      next: () => {
        if (this.values.length) {
          return Promise.resolve({
            value: this.values.shift() as string,
            done: false,
          });
        }
        if (this.failure) return Promise.reject(this.failure);
        if (this.ended)
          return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve, reject) =>
          this.waiters.push({ resolve, reject }),
        );
      },
    };
  }

  private flush(): void {
    while (this.waiters.length) {
      const waiter = this.waiters.shift();
      if (this.failure) waiter?.reject(this.failure);
      else waiter?.resolve({ value: undefined, done: true });
    }
  }
}

export function controlledStrategy() {
  const calls: Array<{
    messages: Message[];
    signal?: AbortSignal;
    stream: ControlledStream;
  }> = [];
  const strategy: LLMStrategy = {
    generateStream(messages, signal) {
      const stream = new ControlledStream();
      signal?.addEventListener("abort", () => stream.finish(), { once: true });
      calls.push({ messages, ...(signal ? { signal } : {}), stream });
      return stream;
    },
  };
  return { strategy, calls };
}

export function message(
  id: string,
  role: Message["role"],
  content: string,
  status: Message["status"] = "done",
): Message {
  return { id, role, content, timestamp: 1, status };
}

export function accountFixture(userId: string, initial: ChatThread[] = []) {
  const records = new Map(
    initial.map((thread) => [thread.id, structuredClone(thread)]),
  );
  const imports: ChatThread[] = [];
  const saves: Array<{ threadId: string; prompt: Message; response: Message }> =
    [];
  const repository: ChatRepository = {
    async listThreads(): Promise<ChatThreadMeta[]> {
      return [...records.values()]
        .map(({ id, title, createdAt, updatedAt }) => ({
          id,
          title,
          createdAt,
          updatedAt,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
    },
    async getThread(_uid, threadId) {
      const thread = records.get(threadId);
      return thread ? structuredClone(thread) : null;
    },
    async importGuestThread(_uid, thread) {
      imports.push(structuredClone(thread));
      if (!records.has(thread.id))
        records.set(thread.id, structuredClone(thread));
    },
    async saveExchange(_uid, threadId, prompt, response) {
      saves.push({
        threadId,
        prompt: { ...prompt },
        response: { ...response },
      });
      const existing = records.get(threadId);
      const messages = existing?.messages ?? [];
      for (const message of [prompt, response]) {
        const index = messages.findIndex(({ id }) => id === message.id);
        if (index < 0) messages.push({ ...message });
        else messages[index] = { ...message };
      }
      const now = Date.now();
      records.set(threadId, {
        id: threadId,
        title: existing?.title ?? prompt.content.slice(0, 60),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        messages,
      });
    },
  };
  return { userId, repository, records, imports, saves };
}
