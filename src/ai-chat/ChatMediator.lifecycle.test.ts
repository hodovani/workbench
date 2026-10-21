import { describe, expect, it } from "vitest";
import type { Message } from "@/ai-chat/types";
import type { ChatRepository, ChatThread } from "@/storage/types";
import { ChatMediator } from "./ChatMediator";
import { ObservableThreadStore } from "./ThreadStore";

const message = (content: string): Message => ({
  id: content,
  role: "user",
  content,
  timestamp: 1,
  status: "done",
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("ChatMediator session lifecycle", () => {
  it("does not let a load from an earlier same-account session replace the current thread", async () => {
    const oldLoad = deferred<ChatThread | null>();
    const staleRepository: ChatRepository = {
      listThreads: async () => [
        { id: "current", title: "Old", createdAt: 1, updatedAt: 1 },
      ],
      getThread: () => oldLoad.promise,
      importGuestThread: async () => {},
      saveExchange: async () => {},
    };
    const currentThread: ChatThread = {
      id: "current",
      title: "Current",
      createdAt: 1,
      updatedAt: 2,
      messages: [message("current session")],
    };
    const currentRepository: ChatRepository = {
      listThreads: async () => [
        { id: "current", title: "Current", createdAt: 1, updatedAt: 2 },
      ],
      getThread: async () => currentThread,
      importGuestThread: async () => {},
      saveExchange: async () => {},
    };
    const mediator = new ChatMediator(new ObservableThreadStore());

    const staleAttach = mediator.attach(staleRepository, "account-a");
    mediator.detach();
    await mediator.attach(currentRepository, "account-a");
    oldLoad.resolve({
      id: "current",
      title: "Old",
      createdAt: 1,
      updatedAt: 1,
      messages: [message("stale session")],
    });
    await staleAttach;

    expect(
      mediator
        .getThreadStore()
        .getSnapshot()
        .map(({ content }) => content),
    ).toEqual(["current session"]);
  });
});

it("lets a guest send immediately and keeps the transcript in memory", async () => {
  const generated: string[] = [];
  const strategy = {
    async *generateStream(messages: Message[]) {
      generated.push(messages.at(-1)?.content ?? "");
      yield "guest reply";
    },
  };
  const mediator = new ChatMediator(new ObservableThreadStore(), strategy);

  await mediator.sendMessage("hello without an account");

  expect(generated).toEqual(["hello without an account"]);
  expect(
    mediator
      .getThreadStore()
      .getSnapshot()
      .map(({ content }) => content),
  ).toEqual(["hello without an account", "guest reply"]);
});

it("commits a signed-in prompt and pending response before starting generation", async () => {
  const events: string[] = [];
  const repository: ChatRepository = {
    listThreads: async () => [],
    getThread: async () => null,
    importGuestThread: async () => {},
    saveExchange: async (_uid, _threadId, _prompt, response) => {
      events.push(`saved:${response.status}`);
    },
  };
  const strategy = {
    async *generateStream() {
      events.push("generated");
      yield "saved reply";
    },
  };
  const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
  await mediator.attach(repository, "account-a");

  await mediator.sendMessage("durable prompt");

  expect(events).toEqual(["saved:loading", "generated", "saved:done"]);
});
