import type { Message } from "@/ai-chat/types";

export interface ChatThreadMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatThread extends ChatThreadMeta {
  messages: Message[];
}

/** Storage port shared by the Firestore adapter and the in-memory test repository. */
export interface ChatRepository {
  listThreads(userId: string): Promise<ChatThreadMeta[]>;
  getThread(userId: string, threadId: string): Promise<ChatThread | null>;
  importGuestThread(userId: string, thread: ChatThread): Promise<void>;
  saveExchange(
    userId: string,
    threadId: string,
    prompt: Message,
    response: Message,
  ): Promise<void>;
}
