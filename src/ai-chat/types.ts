import type { ChatThreadMeta } from "@/storage/types";

export type MessageRole = "user" | "assistant";
export const MessageStatus = {
  Loading: "loading",
  Streaming: "streaming",
  Done: "done",
  Error: "error",
  Interrupted: "interrupted",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];
export type Listener = () => void;
export type ChatPhase =
  | "idle"
  | "loading"
  | "saving"
  | "streaming"
  | "importing";
export type ChatRecovery = "load" | "save" | null;

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  status: MessageStatus;
}

export interface LLMStrategy {
  generateStream(
    messages: Message[],
    signal?: AbortSignal,
  ): AsyncIterable<string>;
}

export interface ChatSnapshot {
  userId: string | null;
  threadId: string | null;
  threads: ChatThreadMeta[];
  messages: Message[];
  phase: ChatPhase;
  error: string | null;
  recovery: ChatRecovery;
  canSend: boolean;
  canRetry: boolean;
}
