import type { Message } from "@/ai-chat/types";
import type { ChatRepository, ChatThread, ChatThreadMeta } from "./types";

/**
 * In-memory Mock Chat Repository for testing and storybooks.
 * Has zero dependencies on network or cloud databases.
 */
export class MockChatRepository implements ChatRepository {
  // Store: userId -> threadId -> ChatThread
  private store: Map<string, Map<string, ChatThread>> = new Map();
  private imports = new Map<string, string>();

  private getUserMap(userId: string): Map<string, ChatThread> {
    let userMap = this.store.get(userId);
    if (!userMap) {
      userMap = new Map();
      this.store.set(userId, userMap);
    }
    return userMap;
  }

  public async listThreads(userId: string): Promise<ChatThreadMeta[]> {
    const userMap = this.getUserMap(userId);
    const threads = Array.from(userMap.values());
    return threads
      .map(({ id, title, createdAt, updatedAt }) => ({
        id,
        title,
        createdAt,
        updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  }

  public async getThread(
    userId: string,
    threadId: string,
  ): Promise<ChatThread | null> {
    const userMap = this.getUserMap(userId);
    const thread = userMap.get(threadId);
    return thread ? { ...thread, messages: [...thread.messages] } : null;
  }

  public async importGuestThread(
    userId: string,
    thread: ChatThread,
  ): Promise<void> {
    if (thread.messages.length > 100)
      throw new Error("A guest thread can contain at most 100 messages");
    const key = `${userId}/${thread.id}`;
    const fingerprint = JSON.stringify({
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      messages: thread.messages.map(
        ({ id, role, content, timestamp, status }) => ({
          id,
          role,
          content,
          timestamp,
          status,
        }),
      ),
    });
    const existing = this.imports.get(key);
    if (existing === fingerprint) return;
    const userMap = this.getUserMap(userId);
    const savedThread = userMap.get(thread.id);
    if (!existing && !savedThread) {
      userMap.set(thread.id, { ...thread, messages: [...thread.messages] });
      this.imports.set(key, fingerprint);
      return;
    }
    if (!existing || !savedThread)
      throw new Error("Thread already exists with different content");
    if (
      savedThread.title !== thread.title ||
      savedThread.createdAt !== thread.createdAt
    )
      throw new Error("Thread metadata conflicts with imported content");
    const additions = thread.messages.filter((message) => {
      const saved = savedThread.messages.find((item) => item.id === message.id);
      if (saved && JSON.stringify(saved) !== JSON.stringify(message))
        throw new Error("Message ID conflicts with imported content");
      return !saved;
    });
    if (additions.length) {
      userMap.set(thread.id, {
        ...savedThread,
        updatedAt: Math.max(savedThread.updatedAt, thread.updatedAt),
        messages: [...savedThread.messages, ...additions].sort(
          (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id),
        ),
      });
    }
  }

  public async saveExchange(
    userId: string,
    threadId: string,
    prompt: Message,
    response: Message,
  ): Promise<void> {
    if (
      prompt.role !== "user" ||
      response.role !== "assistant" ||
      !prompt.id ||
      !response.id ||
      typeof prompt.content !== "string" ||
      typeof response.content !== "string" ||
      !Number.isFinite(prompt.timestamp) ||
      !Number.isFinite(response.timestamp) ||
      prompt.id === response.id
    )
      throw new Error("Exchange is invalid");
    const userMap = this.getUserMap(userId);
    const thread = userMap.get(threadId);
    const messages = thread?.messages ?? [];
    const existingPrompt = messages.find((message) => message.id === prompt.id);
    const existingResponse = messages.find(
      (message) => message.id === response.id,
    );
    if (
      existingPrompt &&
      JSON.stringify(existingPrompt) !== JSON.stringify(prompt)
    )
      throw new Error("Prompt ID conflicts with saved content");
    if (
      existingResponse &&
      (existingResponse.role !== response.role ||
        existingResponse.timestamp !== response.timestamp)
    )
      throw new Error("Response ID conflicts with saved content");
    if (prompt.id === response.id)
      throw new Error("Exchange message IDs must differ");
    const now = Math.max(prompt.timestamp, response.timestamp);
    const next = messages.filter(
      (message) => message.id !== prompt.id && message.id !== response.id,
    );
    next.push(prompt, response);
    userMap.set(threadId, {
      id: threadId,
      title: thread?.title ?? prompt.content.slice(0, 60),
      createdAt: thread?.createdAt ?? prompt.timestamp,
      updatedAt: now,
      messages: next.sort(
        (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id),
      ),
    });
  }

  // Testing helper: clear all data
  public clear(): void {
    this.store.clear();
    this.imports.clear();
  }
}
