import { describe, expect, it } from "vitest";
import type { Message } from "@/ai-chat/types";
import { MockChatRepository } from "./MockChatRepository";

const message = (id: string, timestamp: number): Message => ({
  id,
  role: "user",
  content: `body ${id}`,
  timestamp,
  status: "done",
});

describe("MockChatRepository (ChatRepository port contract)", () => {
  it("imports a guest transcript idempotently and rejects conflicting reuse", async () => {
    const repo = new MockChatRepository();
    const thread = {
      id: "guest-1",
      title: "body old-prompt",
      createdAt: 1,
      updatedAt: 2,
      messages: [
        message("prompt-1", 1),
        { ...message("response-1", 2), role: "assistant" as const },
      ],
    };

    await repo.importGuestThread("user-1", thread);
    await repo.importGuestThread("user-1", thread);

    expect(await repo.getThread("user-1", "guest-1")).toEqual(thread);
    await expect(
      repo.importGuestThread("user-1", { ...thread, title: "different" }),
    ).rejects.toThrow();
    expect(await repo.getThread("user-1", "guest-1")).toEqual(thread);
  });

  it("adds new guest messages to an imported thread without replacing shared records", async () => {
    const repo = new MockChatRepository();
    const original = {
      id: "guest-1",
      title: "body old-prompt",
      createdAt: 1,
      updatedAt: 2,
      messages: [
        message("prompt-1", 1),
        { ...message("response-1", 2), role: "assistant" as const },
      ],
    };
    await repo.importGuestThread("user-1", original);
    const extended = {
      ...original,
      updatedAt: 4,
      messages: [
        ...original.messages,
        message("prompt-2", 3),
        { ...message("response-2", 4), role: "assistant" as const },
      ],
    };

    await repo.importGuestThread("user-1", extended);

    expect(await repo.getThread("user-1", "guest-1")).toEqual(extended);
    await expect(
      repo.importGuestThread("user-1", {
        ...extended,
        messages: extended.messages.map((item) =>
          item.id === "response-1" ? { ...item, content: "conflict" } : item,
        ),
      }),
    ).rejects.toThrow();
    expect(await repo.getThread("user-1", "guest-1")).toEqual(extended);
  });

  it("saves an exchange idempotently, updates its response, and preserves older history", async () => {
    const repo = new MockChatRepository();
    await repo.saveExchange("user-1", "thread-1", message("old-prompt", 1), {
      ...message("old-response", 2),
      role: "assistant",
    });
    const prompt = message("prompt-2", 3);
    const response = {
      ...message("response-2", 4),
      role: "assistant" as const,
      status: "loading" as const,
    };

    await repo.saveExchange("user-1", "thread-1", prompt, response);
    await repo.saveExchange("user-1", "thread-1", prompt, {
      ...response,
      content: "finished",
      status: "done",
    });

    expect(await repo.getThread("user-1", "thread-1")).toEqual({
      id: "thread-1",
      title: "body old-prompt",
      createdAt: 1,
      updatedAt: 4,
      messages: [
        message("old-prompt", 1),
        { ...message("old-response", 2), role: "assistant" },
        prompt,
        { ...response, content: "finished", status: "done" },
      ],
    });
    await expect(
      repo.saveExchange(
        "user-1",
        "thread-1",
        { ...prompt, content: "conflict" },
        response,
      ),
    ).rejects.toThrow();
  });

  it("returns null for a thread that was never saved", async () => {
    const repo = new MockChatRepository();
    expect(await repo.getThread("user-1", "current")).toBeNull();
  });

  it("isolates threads per user", async () => {
    const repo = new MockChatRepository();
    await repo.saveExchange("user-1", "current", message("m1", 1), {
      ...message("r1", 2),
      role: "assistant",
    });
    await repo.saveExchange("user-2", "current", message("m2", 1), {
      ...message("r2", 2),
      role: "assistant",
    });

    const one = await repo.getThread("user-1", "current");
    const two = await repo.getThread("user-2", "current");

    expect(one?.messages.map((m) => m.id)).toEqual(["m1", "r1"]);
    expect(two?.messages.map((m) => m.id)).toEqual(["m2", "r2"]);
  });

  it("creates thread metadata from an exchange", async () => {
    const repo = new MockChatRepository();
    await repo.saveExchange("user-1", "current", message("m1", 1), {
      ...message("r1", 2),
      role: "assistant",
    });

    const [meta] = await repo.listThreads("user-1");
    expect(meta?.id).toBe("current");
    expect(meta?.createdAt).toBeTypeOf("number");
    expect(meta?.updatedAt).toBeTypeOf("number");
  });

  it("lists threads newest-updated first", async () => {
    const repo = new MockChatRepository();
    await repo.saveExchange("user-1", "old", message("old-p", 100), {
      ...message("old-r", 100),
      role: "assistant",
    });
    await repo.saveExchange("user-1", "new", message("new-p", 200), {
      ...message("new-r", 200),
      role: "assistant",
    });

    expect((await repo.listThreads("user-1")).map((t) => t.id)).toEqual([
      "new",
      "old",
    ]);
  });
});
