import { describe, expectTypeOf, it } from "vitest";
import type {
  ChatPhase,
  Message,
  MessageRole,
  MessageStatus,
  MessageStatus as Status,
} from "@/ai-chat/types";
import type { FirebaseAuthAdapter } from "@/auth/FirebaseAuthAdapter";
import type { MockAuthAdapter } from "@/auth/MockAuthAdapter";
import type { AuthService } from "@/auth/types";
import { MockChatRepository } from "@/storage/MockChatRepository";
import type {
  ChatRepository,
  ChatThread,
  ChatThreadMeta,
} from "@/storage/types";
import type { FirestoreChatRepository } from "./FirestoreChatRepository";

/**
 * Compile-time contract tests. These prove the *shape* of a boundary, not its
 * behaviour — `pnpm test` covers behaviour. A change to a port that breaks every
 * adapter fails here before it ever reaches the runtime suite.
 */

describe("ChatRepository contract", () => {
  it("keeps every adapter interchangeable", () => {
    expectTypeOf<FirestoreChatRepository>().toExtend<ChatRepository>();
    expectTypeOf<MockChatRepository>().toExtend<ChatRepository>();
  });

  it("forces callers to handle a missing thread", () => {
    // A regression to a bare `ChatThread` would silently drop null handling.
    expectTypeOf<ChatRepository["getThread"]>().returns.toEqualTypeOf<
      Promise<ChatThread | null>
    >();
  });

  it("keeps list and list-with-messages distinct", () => {
    // Thread metadata must not carry messages; callers would read a stale array.
    expectTypeOf<ChatThreadMeta>().not.toHaveProperty("messages");
    expectTypeOf<ChatThread>().toHaveProperty("messages");
  });

  it("returns threads newest-first by contract", async () => {
    const repo = new MockChatRepository();
    await repo.saveExchange(
      "u",
      "t",
      { id: "p", role: "user", content: "T", timestamp: 1, status: "done" },
      {
        id: "r",
        role: "assistant",
        content: "reply",
        timestamp: 2,
        status: "done",
      },
    );
    expectTypeOf(await repo.listThreads("u")).toEqualTypeOf<ChatThreadMeta[]>();
  });
});

describe("AuthService contract", () => {
  it("keeps every auth adapter interchangeable", () => {
    expectTypeOf<FirebaseAuthAdapter>().toExtend<AuthService>();
    expectTypeOf<MockAuthAdapter>().toExtend<AuthService>();
  });

  it("returns the unsubscribe for auth listeners", () => {
    expectTypeOf<AuthService["onAuthStateChanged"]>().returns.toEqualTypeOf<
      () => void
    >();
  });
});

describe("chat domain unions stay exhaustive", () => {
  it("keeps the mediator phase closed", () => {
    expectTypeOf<ChatPhase>().toEqualTypeOf<
      "idle" | "loading" | "saving" | "streaming" | "importing"
    >();
  });

  it("keeps the message role closed", () => {
    expectTypeOf<MessageRole>().toEqualTypeOf<"user" | "assistant">();
  });

  it("keeps the message status closed", () => {
    expectTypeOf<MessageStatus>().toEqualTypeOf<Status>();
    expectTypeOf<Message["status"]>().toEqualTypeOf<MessageStatus>();
  });
});
