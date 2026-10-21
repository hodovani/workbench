import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/ai-chat/types";

vi.mock("firebase/firestore", () => ({
  collection: (...path: unknown[]) => ({ kind: "collection", path }),
  doc: (...path: unknown[]) => ({ kind: "doc", path }),
  query: (...args: unknown[]) => ({ kind: "query", args }),
  orderBy: (field: string, direction: string) => ({
    kind: "orderBy",
    field,
    direction,
  }),
  documentId: () => ({ kind: "documentId" }),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
}));

const { getDoc, getDocs } = await import("firebase/firestore");
const { FirestoreChatRepository } = await import("./FirestoreChatRepository");

const message = (id: string): Message => ({
  id,
  role: "assistant",
  content: `body ${id}`,
  timestamp: 1,
  status: "done",
});

const snapshot = (docs: { id: string; data: () => unknown }[]) => ({
  docs: docs.map((d) => ({ ...d, ref: { kind: "doc", path: d.id } })),
  exists: docs.length > 0,
});

describe("FirestoreChatRepository", () => {
  const repo = new FirestoreChatRepository({} as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists threads newest-updated first", async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshot([
        {
          id: "t2",
          data: () => ({ title: "B", createdAt: 2, updatedAt: 200 }),
        },
        {
          id: "t1",
          data: () => ({ title: "A", createdAt: 1, updatedAt: 100 }),
        },
      ]) as never,
    );

    const threads = await repo.listThreads("user-1");

    expect(threads.map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  it("queries thread metadata without reading message subcollections", async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot([]) as never);

    await repo.listThreads("user-1");

    expect(getDocs).toHaveBeenCalledTimes(1);
    const query = vi.mocked(getDocs).mock.calls[0]?.[0] as unknown as {
      args: [{ path: unknown[] }];
    };
    expect(query.args[0]?.path.slice(-3)).toEqual([
      "users",
      "user-1",
      "threads",
    ]);
    expect(getDoc).not.toHaveBeenCalled();
  });

  it("falls back to defaults when thread metadata is incomplete", async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshot([{ id: "t1", data: () => ({}) }]) as never,
    );

    const [thread] = await repo.listThreads("user-1");

    expect(thread?.title).toBe("Untitled Chat");
    expect(thread?.createdAt).toBeTypeOf("number");
  });

  it("returns null for a thread that does not exist", async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
      id: "current",
      data: () => ({}),
    } as never);

    expect(await repo.getThread("user-1", "current")).toBeNull();
  });

  it("returns a thread with its messages in timestamp order", async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      id: "current",
      data: () => ({ title: "Chat", createdAt: 1, updatedAt: 2 }),
    } as never);
    vi.mocked(getDocs).mockResolvedValue(
      snapshot([
        { id: "m1", data: () => message("m1") },
        { id: "m2", data: () => message("m2") },
      ]) as never,
    );

    const thread = await repo.getThread("user-1", "current");

    expect(thread?.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(thread?.title).toBe("Chat");
  });
});
