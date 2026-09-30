export type MessageRole = "user" | "assistant";
export const MessageStatus = {
  Loading: "loading",
  Streaming: "streaming",
  Done: "done",
  Error: "error",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];
export type AppState = "checking" | "nokey" | "active";
export type Listener = () => void;

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  status: MessageStatus;
}

export interface StorageAdapter {
  has(key: string): boolean;
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface LLMStrategy {
  generateStream(messages: Message[], apiKey: string): AsyncIterable<string>;
}

export interface ObservableThreadStore {
  getSnapshot(): Message[];
  subscribe(listener: () => void): () => void;
  appendMessage(message: Message): void;
  appendChunkToActive(chunk: string): void;
  markActiveDone(): void;
  setError(error: string): void;
  resetActive?(): void;
}

export interface ChatMediator {
  getAppState(): AppState;
  subscribeState(listener: () => void): () => void;
  init(): void;
  saveApiKey(key: string): Promise<boolean>;
  clearApiKey?(): void;
  sendMessage(text: string): Promise<void>;
  retryLastMessage(): Promise<void>;
}
