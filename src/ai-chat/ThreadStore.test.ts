import { describe, expect, it } from "vitest";
import { ObservableThreadStore } from "./ThreadStore";
import type { Message } from "./types";

const message = (
  id: string,
  role: Message["role"] = "assistant",
  content = "",
  status: Message["status"] = "done",
): Message => ({ id, role, content, timestamp: 1, status });

describe("ObservableThreadStore", () => {
  it("notifies subscribers when messages change", () => {
    const store = new ObservableThreadStore();
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });

    store.appendMessage(message("m1"));
    store.hydrate([message("m2")]);

    expect(notified).toBe(2);
  });

  it("replaces the whole thread and turns persisted pending responses into interrupted", () => {
    const store = new ObservableThreadStore();
    store.appendMessage(message("old"));

    store.hydrate([message("pending", "assistant", "partial", "streaming")]);

    expect(store.getSnapshot()).toEqual([
      message("pending", "assistant", "partial", "interrupted"),
    ]);
  });

  it("updates a response by ID without touching other messages", () => {
    const store = new ObservableThreadStore();
    store.hydrate([
      message("prompt", "user", "hello"),
      message("response", "assistant", "part", "streaming"),
    ]);

    expect(
      store.updateMessage("response", (current) => ({
        ...current,
        content: `${current.content}ial`,
      })),
    ).toBe(true);
    expect(store.getSnapshot()).toEqual([
      message("prompt", "user", "hello"),
      message("response", "assistant", "partial", "interrupted"),
    ]);
  });

  it("does not notify after unsubscribe", () => {
    const store = new ObservableThreadStore();
    let notified = 0;
    const unsubscribe = store.subscribe(() => {
      notified += 1;
    });

    unsubscribe();
    store.hydrate([message("m1")]);

    expect(notified).toBe(0);
  });
});
