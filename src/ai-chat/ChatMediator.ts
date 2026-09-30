import { BrowserStorageAdapter } from "./BrowserStorageAdapter";
import { GeminiStreamStrategy } from "./GeminiStreamStrategy";
import { ObservableThreadStore } from "./ThreadStore";
import type {
  AppState,
  ChatMediator as IChatMediator,
  ObservableThreadStore as IObservableThreadStore,
  LLMStrategy,
  Message,
  StorageAdapter,
} from "./types";

export const API_KEY_STORAGE_KEY = "gemini_api_key";

export class ChatMediator implements IChatMediator {
  // State & Injected Dependencies
  private appState: AppState = "checking";
  private threadStore: IObservableThreadStore;
  private storage: StorageAdapter;
  private llmStrategy: LLMStrategy;
  private stateListeners: Set<() => void> = new Set();
  private isInitialized = false;
  private isStreamingActive = false;
  private lastUserPrompt = "";

  constructor(
    threadStore?: IObservableThreadStore,
    storage?: StorageAdapter,
    llmStrategy?: LLMStrategy,
  ) {
    this.threadStore = threadStore ?? new ObservableThreadStore();
    this.storage =
      storage ??
      new BrowserStorageAdapter(
        typeof window !== "undefined" ? window.localStorage : ({} as Storage),
      );
    this.llmStrategy = llmStrategy ?? new GeminiStreamStrategy();
  }

  // Public Getters & Subscriptions
  public getAppState = (): AppState => {
    return this.appState;
  };

  public getThreadStore = (): IObservableThreadStore => {
    return this.threadStore;
  };

  public isBusy = (): boolean => {
    return this.isStreamingActive;
  };

  public subscribeState = (listener: () => void): (() => void) => {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  };

  // Lifecycle
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const key = this.storage.get(API_KEY_STORAGE_KEY);
    this.appState = key && key.trim().length > 0 ? "active" : "nokey";
    this.notifyStateChange();
  }

  public async saveApiKey(key: string): Promise<boolean> {
    const trimmed = key.trim();
    if (!trimmed) return false;

    this.storage.set(API_KEY_STORAGE_KEY, trimmed);
    this.appState = "active";
    this.notifyStateChange();
    return true;
  }

  public clearApiKey = (): void => {
    this.storage.remove(API_KEY_STORAGE_KEY);
    this.appState = "nokey";
    this.notifyStateChange();
  };

  public async sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || this.isStreamingActive) return;

    const key = this.storage.get(API_KEY_STORAGE_KEY);
    if (!key) {
      this.appState = "nokey";
      this.notifyStateChange();
      return;
    }

    this.lastUserPrompt = trimmed;
    this.isStreamingActive = true;
    this.notifyStateChange();

    // 1. Append User Message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
      status: "done",
    };
    this.threadStore.appendMessage(userMessage);

    // 2. Append Assistant Message in Loading state
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      status: "loading",
    };
    this.threadStore.appendMessage(assistantMessage);

    // 3. Stream Response
    try {
      const messagesSnapshot = this.threadStore.getSnapshot();
      const promptHistory = messagesSnapshot.filter(
        (m) => m.id !== assistantMessage.id,
      );

      const stream = this.llmStrategy.generateStream(promptHistory, key);

      for await (const chunk of stream) {
        this.threadStore.appendChunkToActive(chunk);
      }
      this.threadStore.markActiveDone();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while communicating with the AI.";
      this.threadStore.setError(errorMsg);
    } finally {
      this.isStreamingActive = false;
      this.notifyStateChange();
    }
  }

  public async retryLastMessage(): Promise<void> {
    if (!this.lastUserPrompt || this.isStreamingActive) return;

    const key = this.storage.get(API_KEY_STORAGE_KEY);
    if (!key) {
      this.appState = "nokey";
      this.notifyStateChange();
      return;
    }

    this.isStreamingActive = true;
    this.notifyStateChange();

    // Reset active error message back to loading state
    if (this.threadStore.resetActive) {
      this.threadStore.resetActive();
    }

    try {
      const messagesSnapshot = this.threadStore.getSnapshot();
      // Use all messages except the last active assistant placeholder
      const promptHistory = messagesSnapshot.slice(0, -1);

      const stream = this.llmStrategy.generateStream(promptHistory, key);

      for await (const chunk of stream) {
        this.threadStore.appendChunkToActive(chunk);
      }
      this.threadStore.markActiveDone();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during retry.";
      this.threadStore.setError(errorMsg);
    } finally {
      this.isStreamingActive = false;
      this.notifyStateChange();
    }
  }

  // Internal Helpers
  private notifyStateChange(): void {
    this.stateListeners.forEach((listener) => {
      listener();
    });
  }
}

export const chatMediator = new ChatMediator();
