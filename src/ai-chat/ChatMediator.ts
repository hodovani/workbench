import type {
  ChatRepository,
  ChatThread,
  ChatThreadMeta,
} from "@/storage/types";
import { ProxyStreamStrategy } from "./ProxyStreamStrategy";
import { ObservableThreadStore } from "./ThreadStore";
import type { ChatSnapshot, LLMStrategy, Message } from "./types";
import { MessageStatus } from "./types";

const DEFAULT_THREAD_TITLE = "New Chat";

interface Exchange {
  threadId: string;
  promptId: string;
  responseId: string;
}

export class ChatMediator {
  private threadStore: ObservableThreadStore;
  private llmStrategy: LLMStrategy;
  private stateListeners = new Set<() => void>();
  private repository: ChatRepository | null = null;
  private userId: string | null = null;
  private threadId: string | null = null;
  private threads: ChatThreadMeta[] = [];
  private phase: ChatSnapshot["phase"] = "idle";
  private error: string | null = null;
  private recovery: ChatSnapshot["recovery"] = null;
  private operation = 0;
  private controller: AbortController | null = null;
  private activeResponseId: string | null = null;
  private pendingInitialSave: Exchange | null = null;
  private pendingFinalSave: Exchange | null = null;
  private frozenImport: ChatThread | null = null;
  private snapshot: ChatSnapshot;

  constructor(
    threadStore: ObservableThreadStore = new ObservableThreadStore(),
    llmStrategy: LLMStrategy = new ProxyStreamStrategy(),
  ) {
    this.threadStore = threadStore;
    this.llmStrategy = llmStrategy;
    this.snapshot = this.makeSnapshot();
    this.threadStore.subscribe(() => this.notifyStateChange());
  }

  public getSnapshot = (): ChatSnapshot => this.snapshot;

  public getThreadStore = (): ObservableThreadStore => this.threadStore;

  public subscribeState = (listener: () => void): (() => void) => {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  };

  public async attach(
    repository: ChatRepository,
    userId: string,
  ): Promise<void> {
    if (this.repository && this.userId === userId) return;

    const wasGuest = this.userId === null;
    if (this.controller) this.interruptGeneration();
    const guestMessages = wasGuest ? this.threadStore.getSnapshot() : [];
    const operation = ++this.operation;
    const changedAccount = this.userId !== null && this.userId !== userId;
    if (changedAccount) this.frozenImport = null;
    this.repository = repository;
    this.userId = userId;
    this.phase = "idle";
    this.error = null;
    this.recovery = null;
    this.pendingInitialSave = null;
    this.pendingFinalSave = null;

    if (changedAccount) {
      this.threadId = null;
      this.threads = [];
      this.threadStore.hydrate([]);
    }

    if (guestMessages.length > 0) {
      const id = this.threadId ?? crypto.randomUUID();
      const now = Date.now();
      const prompt = guestMessages.find((message) => message.role === "user");
      this.threadId = id;
      this.frozenImport = {
        id,
        title: prompt?.content.slice(0, 60) || DEFAULT_THREAD_TITLE,
        createdAt: now,
        updatedAt: now,
        messages: guestMessages.map((message) => ({ ...message })),
      };
      await this.importFrozenThread(operation);
      return;
    }

    this.threadId = null;
    this.threadStore.hydrate([]);
    this.phase = "loading";
    this.notifyStateChange();
    await this.loadLatestThread(operation);
  }

  public detach(): void {
    this.operation += 1;
    this.interruptGeneration();
    this.repository = null;
    this.userId = null;
    this.threadId = null;
    this.threads = [];
    this.phase = "idle";
    this.error = null;
    this.recovery = null;
    this.pendingInitialSave = null;
    this.pendingFinalSave = null;
    this.frozenImport = null;
    this.threadStore.hydrate([]);
    this.notifyStateChange();
  }

  public release(): void {
    if (this.controller) {
      this.operation += 1;
      this.interruptGeneration();
      this.phase = "idle";
      this.notifyStateChange();
    } else if (this.phase === "saving" && this.pendingInitialSave) {
      this.operation += 1;
      this.phase = "idle";
      this.error = "Save acknowledgement was interrupted. Retry saving.";
      this.recovery = "save";
      this.notifyStateChange();
    }
  }

  public async sendMessage(text: string): Promise<boolean> {
    const promptText = text.trim();
    if (!promptText || !this.getSnapshot().canSend) return false;

    const now = Date.now();
    if (!this.threadId) this.threadId = crypto.randomUUID();
    const exchange: Exchange = {
      threadId: this.threadId,
      promptId: crypto.randomUUID(),
      responseId: crypto.randomUUID(),
    };
    const prompt: Message = {
      id: exchange.promptId,
      role: "user",
      content: promptText,
      timestamp: now,
      status: MessageStatus.Done,
    };
    const response: Message = {
      id: exchange.responseId,
      role: "assistant",
      content: "",
      timestamp: now,
      status: MessageStatus.Loading,
    };
    this.threadStore.appendMessage(prompt);
    this.threadStore.appendMessage(response);
    this.activeResponseId = response.id;

    if (!this.userId || !this.repository) {
      await this.generate(exchange);
      return true;
    }

    const operation = this.operation;
    this.pendingInitialSave = exchange;
    this.phase = "saving";
    this.error = null;
    this.recovery = null;
    this.notifyStateChange();
    try {
      await this.repository.saveExchange(
        this.userId,
        exchange.threadId,
        prompt,
        response,
      );
    } catch (error) {
      if (operation === this.operation) this.failSave(error);
      return false;
    }
    if (operation !== this.operation || this.pendingInitialSave !== exchange)
      return false;
    this.pendingInitialSave = null;
    this.touchThread(exchange.threadId, prompt.content);
    await this.generate(exchange);
    return true;
  }

  public async retryLastMessage(): Promise<boolean> {
    if (
      this.phase !== "idle" ||
      this.recovery ||
      !this.getSnapshot().canRetry
    ) {
      return false;
    }
    const messages = this.threadStore.getSnapshot();
    const response = messages.at(-1);
    const prompt = messages.at(-2);
    if (
      !response ||
      response.role !== "assistant" ||
      !prompt ||
      prompt.role !== "user"
    ) {
      return false;
    }
    const exchange = {
      threadId: this.threadId ?? crypto.randomUUID(),
      promptId: prompt.id,
      responseId: response.id,
    };
    this.threadId = exchange.threadId;
    this.threadStore.updateMessage(response.id, (current) => ({
      ...current,
      content: "",
      status: MessageStatus.Loading,
    }));

    if (this.userId && this.repository) {
      const operation = this.operation;
      this.pendingInitialSave = exchange;
      this.phase = "saving";
      this.notifyStateChange();
      try {
        await this.repository.saveExchange(
          this.userId,
          exchange.threadId,
          prompt,
          { ...response, content: "", status: MessageStatus.Loading },
        );
      } catch (error) {
        if (operation === this.operation) this.failSave(error);
        return false;
      }
      if (operation !== this.operation || this.pendingInitialSave !== exchange)
        return false;
      this.pendingInitialSave = null;
    }
    await this.generate(exchange);
    return true;
  }

  public async retrySave(): Promise<boolean> {
    if (this.recovery !== "save" || !this.userId || !this.repository)
      return false;
    if (this.frozenImport) return this.importFrozenThread(this.operation);

    const exchange = this.pendingInitialSave ?? this.pendingFinalSave;
    if (!exchange) return false;
    const messages = this.threadStore.getSnapshot();
    const prompt = messages.find((message) => message.id === exchange.promptId);
    const response = messages.find(
      (message) => message.id === exchange.responseId,
    );
    if (!prompt || !response) return false;

    const operation = this.operation;
    this.phase = "saving";
    this.error = null;
    this.recovery = null;
    this.notifyStateChange();
    try {
      await this.repository.saveExchange(
        this.userId,
        exchange.threadId,
        prompt,
        response,
      );
    } catch (error) {
      if (operation === this.operation) this.failSave(error);
      return false;
    }
    if (operation !== this.operation) return false;
    if (this.pendingInitialSave === exchange) {
      this.pendingInitialSave = null;
      this.touchThread(exchange.threadId, prompt.content);
      await this.generate(exchange);
      return true;
    }
    this.pendingFinalSave = null;
    this.touchThread(exchange.threadId, prompt.content);
    this.phase = "idle";
    this.notifyStateChange();
    return true;
  }

  public async retryLoad(): Promise<boolean> {
    if (this.recovery !== "load" || !this.repository || !this.userId)
      return false;
    const operation = ++this.operation;
    this.phase = "loading";
    this.error = null;
    this.recovery = null;
    this.notifyStateChange();
    if (!this.threadId) return this.loadLatestThread(operation);
    try {
      const thread = await this.repository.getThread(
        this.userId,
        this.threadId,
      );
      if (operation !== this.operation) return false;
      this.threadStore.hydrate(thread?.messages ?? []);
      this.phase = "idle";
      this.notifyStateChange();
      return true;
    } catch (error) {
      this.failLoad(error);
      return false;
    }
  }

  public async selectThread(threadId: string): Promise<boolean> {
    if (!this.userId || !this.repository || !this.canNavigate()) return false;
    const operation = ++this.operation;
    this.threadId = threadId;
    this.phase = "loading";
    this.error = null;
    this.recovery = null;
    this.threadStore.hydrate([]);
    this.notifyStateChange();
    try {
      const thread = await this.repository.getThread(this.userId, threadId);
      if (operation !== this.operation) return false;
      if (!thread) throw new Error("Saved conversation could not be found.");
      this.threadStore.hydrate(thread.messages);
      this.phase = "idle";
      this.notifyStateChange();
      return true;
    } catch (error) {
      if (operation === this.operation) this.failLoad(error);
      return false;
    }
  }

  public newThread(): boolean {
    if (!this.userId || !this.canNavigate()) return false;
    this.operation += 1;
    this.threadId = null;
    this.phase = "idle";
    this.error = null;
    this.recovery = null;
    this.threadStore.hydrate([]);
    this.notifyStateChange();
    return true;
  }

  public hasUnsavedWork(): boolean {
    return (
      this.recovery !== null ||
      this.pendingInitialSave !== null ||
      this.pendingFinalSave !== null ||
      this.frozenImport !== null ||
      (this.userId === null && this.threadStore.getSnapshot().length > 0)
    );
  }

  private async importFrozenThread(operation: number): Promise<boolean> {
    const repository = this.repository;
    const userId = this.userId;
    const thread = this.frozenImport;
    if (!repository || !userId || !thread) return false;
    this.phase = "importing";
    this.error = null;
    this.recovery = null;
    this.notifyStateChange();
    try {
      await repository.importGuestThread(userId, thread);
      if (operation !== this.operation || this.userId !== userId) return false;
      this.touchThread(thread.id, thread.title);
      this.threads = await repository.listThreads(userId);
      if (operation !== this.operation || this.userId !== userId) return false;
      this.frozenImport = null;
      this.phase = "idle";
      this.notifyStateChange();
      return true;
    } catch (error) {
      if (operation === this.operation && this.userId === userId)
        this.failSave(error);
      return false;
    }
  }

  private async loadLatestThread(operation: number): Promise<boolean> {
    const repository = this.repository;
    const userId = this.userId;
    if (!repository || !userId) return false;
    try {
      this.threads = await repository.listThreads(userId);
      if (operation !== this.operation || this.userId !== userId) return false;
      const latest = this.threads[0];
      if (latest) {
        this.threadId = latest.id;
        const thread = await repository.getThread(userId, latest.id);
        if (operation !== this.operation || this.userId !== userId)
          return false;
        if (!thread) throw new Error("Saved conversation could not be found.");
        this.threadStore.hydrate(thread.messages);
      }
      this.phase = "idle";
      this.error = null;
      this.recovery = null;
      this.notifyStateChange();
      return true;
    } catch (error) {
      if (operation === this.operation) this.failLoad(error);
      return false;
    }
  }

  private async generate(exchange: Exchange): Promise<void> {
    const operation = this.operation;
    const controller = new AbortController();
    this.controller = controller;
    this.activeResponseId = exchange.responseId;
    this.phase = "streaming";
    this.error = null;
    this.recovery = null;
    this.notifyStateChange();
    const history = this.threadStore
      .getSnapshot()
      .filter(
        (message) =>
          message.id !== exchange.responseId &&
          message.status === MessageStatus.Done,
      );
    let failed = false;
    try {
      for await (const chunk of this.llmStrategy.generateStream(
        history,
        controller.signal,
      )) {
        if (operation !== this.operation || controller.signal.aborted) return;
        this.threadStore.updateMessage(exchange.responseId, (message) => ({
          ...message,
          content: message.content + chunk,
          status: MessageStatus.Streaming,
        }));
      }
      if (operation !== this.operation || controller.signal.aborted) return;
      this.threadStore.updateMessage(exchange.responseId, (message) => ({
        ...message,
        status: MessageStatus.Done,
      }));
    } catch (error) {
      if (operation !== this.operation || controller.signal.aborted) return;
      failed = true;
      this.error =
        error instanceof Error ? error.message : "The response failed.";
      this.threadStore.updateMessage(exchange.responseId, (message) => ({
        ...message,
        content: this.error ?? "The response failed.",
        status: MessageStatus.Error,
      }));
    }

    if (operation !== this.operation) return;
    this.controller = null;
    this.activeResponseId = null;
    if (this.userId && this.repository) {
      const messages = this.threadStore.getSnapshot();
      const prompt = messages.find(
        (message) => message.id === exchange.promptId,
      );
      const response = messages.find(
        (message) => message.id === exchange.responseId,
      );
      if (prompt && response) {
        try {
          await this.repository.saveExchange(
            this.userId,
            exchange.threadId,
            prompt,
            response,
          );
          if (operation !== this.operation) return;
          this.touchThread(exchange.threadId, prompt.content);
        } catch (error) {
          if (operation !== this.operation) return;
          this.pendingFinalSave = exchange;
          this.failSave(error);
          return;
        }
      }
    }
    this.pendingFinalSave = null;
    this.phase = "idle";
    if (!failed) this.error = null;
    this.notifyStateChange();
  }

  private interruptGeneration(): void {
    const responseId = this.activeResponseId;
    this.controller?.abort();
    this.controller = null;
    this.activeResponseId = null;
    if (responseId) {
      this.threadStore.updateMessage(responseId, (message) => ({
        ...message,
        status: MessageStatus.Interrupted,
      }));
    }
  }

  private touchThread(threadId: string, prompt: string): void {
    const now = Date.now();
    const existing = this.threads.find((thread) => thread.id === threadId);
    const meta: ChatThreadMeta = {
      id: threadId,
      title: existing?.title ?? (prompt.slice(0, 60) || DEFAULT_THREAD_TITLE),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.threads = [
      meta,
      ...this.threads.filter((thread) => thread.id !== threadId),
    ].sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  }

  private canNavigate(): boolean {
    return (
      this.phase === "idle" && this.recovery === null && !this.hasUnsavedWork()
    );
  }

  private failSave(error: unknown): void {
    this.phase = "idle";
    this.error =
      error instanceof Error ? error.message : "Could not save conversation.";
    this.recovery = "save";
    this.notifyStateChange();
  }

  private failLoad(error: unknown): void {
    this.phase = "idle";
    this.error =
      error instanceof Error ? error.message : "Could not load conversation.";
    this.recovery = "load";
    this.notifyStateChange();
  }

  private makeSnapshot(): ChatSnapshot {
    const messages = this.threadStore.getSnapshot();
    const latest = messages.at(-1);
    return {
      userId: this.userId,
      threadId: this.threadId,
      threads: this.threads,
      messages,
      phase: this.phase,
      error: this.error,
      recovery: this.recovery,
      canSend:
        this.phase === "idle" &&
        this.recovery === null &&
        !this.pendingInitialSave &&
        !this.pendingFinalSave &&
        !this.frozenImport &&
        !(
          latest?.role === "assistant" &&
          (latest.status === MessageStatus.Loading ||
            latest.status === MessageStatus.Streaming)
        ),
      canRetry:
        this.phase === "idle" &&
        this.recovery === null &&
        latest?.role === "assistant" &&
        (latest.status === MessageStatus.Error ||
          latest.status === MessageStatus.Interrupted),
    };
  }

  private notifyStateChange(): void {
    this.snapshot = this.makeSnapshot();
    for (const listener of this.stateListeners) listener();
  }
}

export const chatMediator = new ChatMediator();
