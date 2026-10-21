import {
  collection,
  doc,
  documentId,
  type Firestore,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
} from "firebase/firestore";
import type { Message } from "@/ai-chat/types";
import type { ChatRepository, ChatThread, ChatThreadMeta } from "./types";

const messageData = (message: Message) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  timestamp: message.timestamp,
  status: message.status,
});

function validateThread(thread: ChatThread): void {
  if (
    !thread.id ||
    !thread.title ||
    !Number.isFinite(thread.createdAt) ||
    !Number.isFinite(thread.updatedAt)
  ) {
    throw new Error("Guest thread metadata is invalid");
  }
  if (thread.messages.length > 100)
    throw new Error("A guest thread can contain at most 100 messages");
  const ids = new Set<string>();
  for (const message of thread.messages) {
    if (
      !message.id ||
      ids.has(message.id) ||
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string" ||
      !Number.isFinite(message.timestamp) ||
      !["loading", "streaming", "done", "error", "interrupted"].includes(
        message.status,
      )
    ) {
      throw new Error("Guest thread contains an invalid message");
    }
    ids.add(message.id);
  }
}

async function fingerprint(thread: ChatThread): Promise<string> {
  const canonical = JSON.stringify({
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    messages: thread.messages.map(messageData),
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Concrete adapter for Cloud Firestore storage.
 * Follows the collection path:
 *   /users/{userId}/threads/{threadId}
 *   /users/{userId}/threads/{threadId}/messages/{messageId}
 */
export class FirestoreChatRepository implements ChatRepository {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  public async listThreads(userId: string): Promise<ChatThreadMeta[]> {
    const threadsCol = collection(this.db, "users", userId, "threads");
    const q = query(
      threadsCol,
      orderBy("updatedAt", "desc"),
      orderBy(documentId(), "asc"),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: (data.title as string) || "Untitled Chat",
        createdAt: (data.createdAt as number) || Date.now(),
        updatedAt: (data.updatedAt as number) || Date.now(),
      };
    });
  }

  public async importGuestThread(
    userId: string,
    thread: ChatThread,
  ): Promise<void> {
    validateThread(thread);
    const guestImportFingerprint = await fingerprint(thread);
    const threadRef = doc(this.db, "users", userId, "threads", thread.id);
    const messageRefs = thread.messages.map((message) =>
      doc(
        this.db,
        "users",
        userId,
        "threads",
        thread.id,
        "messages",
        message.id,
      ),
    );
    await runTransaction(this.db, async (transaction) => {
      const existing = await transaction.get(threadRef);
      if (existing.exists()) {
        const data = existing.data();
        if (data.guestImportFingerprint === guestImportFingerprint) return;
        if (
          !data.guestImportFingerprint ||
          data.title !== thread.title ||
          data.createdAt !== thread.createdAt
        ) {
          throw new Error("Thread already exists with different content");
        }
        const messages = await Promise.all(
          messageRefs.map((ref) => transaction.get(ref)),
        );
        const additions: number[] = [];
        messages.forEach((snapshot, index) => {
          if (!snapshot.exists()) {
            additions.push(index);
            return;
          }
          const incoming = thread.messages[index];
          const saved = snapshot.data();
          if (
            !incoming ||
            saved.id !== incoming.id ||
            saved.role !== incoming.role ||
            saved.content !== incoming.content ||
            saved.timestamp !== incoming.timestamp ||
            saved.status !== incoming.status
          ) {
            throw new Error("Message ID conflicts with imported content");
          }
        });
        if (additions.length) {
          transaction.set(
            threadRef,
            { updatedAt: Math.max(data.updatedAt, thread.updatedAt) },
            { merge: true },
          );
          for (const index of additions) {
            const messageRef = messageRefs[index];
            const message = thread.messages[index];
            if (messageRef && message)
              transaction.set(messageRef, messageData(message));
          }
        }
        return;
      }
      const messages = await Promise.all(
        messageRefs.map((ref) => transaction.get(ref)),
      );
      if (messages.some((message) => message.exists()))
        throw new Error("Guest thread messages already exist");
      transaction.set(threadRef, {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        guestImportFingerprint,
      });
      for (const [index, message] of thread.messages.entries()) {
        const messageRef = messageRefs[index];
        if (messageRef) transaction.set(messageRef, messageData(message));
      }
    });
  }

  public async saveExchange(
    userId: string,
    threadId: string,
    prompt: Message,
    response: Message,
  ): Promise<void> {
    if (
      !threadId ||
      prompt.role !== "user" ||
      response.role !== "assistant" ||
      !prompt.id ||
      !response.id ||
      prompt.id === response.id ||
      typeof prompt.content !== "string" ||
      typeof response.content !== "string" ||
      !Number.isFinite(prompt.timestamp) ||
      !Number.isFinite(response.timestamp)
    ) {
      throw new Error("Exchange is invalid");
    }
    const threadRef = doc(this.db, "users", userId, "threads", threadId);
    const promptRef = doc(
      this.db,
      "users",
      userId,
      "threads",
      threadId,
      "messages",
      prompt.id,
    );
    const responseRef = doc(
      this.db,
      "users",
      userId,
      "threads",
      threadId,
      "messages",
      response.id,
    );
    await runTransaction(this.db, async (transaction) => {
      const [threadSnap, promptSnap, responseSnap] = await Promise.all([
        transaction.get(threadRef),
        transaction.get(promptRef),
        transaction.get(responseRef),
      ]);
      const oldPrompt = promptSnap.exists() ? promptSnap.data() : null;
      const oldResponse = responseSnap.exists() ? responseSnap.data() : null;
      if (
        oldPrompt &&
        (oldPrompt.role !== prompt.role ||
          oldPrompt.content !== prompt.content ||
          oldPrompt.timestamp !== prompt.timestamp)
      ) {
        throw new Error("Prompt ID conflicts with saved content");
      }
      if (
        oldResponse &&
        (oldResponse.role !== response.role ||
          oldResponse.timestamp !== response.timestamp)
      ) {
        throw new Error("Response ID conflicts with saved content");
      }
      const now = Math.max(prompt.timestamp, response.timestamp);
      transaction.set(
        threadRef,
        {
          id: threadId,
          title: threadSnap.exists()
            ? threadSnap.data().title
            : prompt.content.slice(0, 60),
          createdAt: threadSnap.exists()
            ? threadSnap.data().createdAt
            : prompt.timestamp,
          updatedAt: now,
        },
        { merge: true },
      );
      transaction.set(promptRef, messageData(prompt));
      transaction.set(responseRef, messageData(response));
    });
  }

  public async getThread(
    userId: string,
    threadId: string,
  ): Promise<ChatThread | null> {
    const threadRef = doc(this.db, "users", userId, "threads", threadId);
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      return null;
    }

    const threadData = threadSnap.data();

    // Fetch messages subcollection
    const messagesCol = collection(
      this.db,
      "users",
      userId,
      "threads",
      threadId,
      "messages",
    );
    const messagesQuery = query(messagesCol, orderBy("timestamp", "asc"));
    const messagesSnap = await getDocs(messagesQuery);

    const messages: Message[] = messagesSnap.docs.map((d) => {
      const data = d.data();
      if (
        !["user", "assistant"].includes(data.role) ||
        typeof data.content !== "string" ||
        !Number.isFinite(data.timestamp) ||
        !["loading", "streaming", "done", "error", "interrupted"].includes(
          data.status,
        )
      ) {
        throw new Error(`Stored message ${d.id} is malformed`);
      }
      return {
        id: d.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp,
        status: data.status,
      };
    });

    return {
      id: threadSnap.id,
      title: (threadData.title as string) || "Untitled Chat",
      createdAt: (threadData.createdAt as number) || Date.now(),
      updatedAt: (threadData.updatedAt as number) || Date.now(),
      messages,
    };
  }
}
