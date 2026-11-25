// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatSnapshot } from "@/ai-chat/hooks/useChatSnapshot";
import type { ChatSnapshot } from "@/ai-chat/types";
import { ChatSession } from "./ChatSession";

vi.mock("@/ai-chat/hooks/useChatSnapshot", () => ({
  useChatSnapshot: vi.fn(),
}));
vi.mock("@/ai-chat/hooks/useThreadSync", () => ({
  useThreadSync: vi.fn(),
}));

const emptySnapshot: ChatSnapshot = {
  userId: null,
  threadId: null,
  threads: [],
  messages: [],
  phase: "idle",
  error: null,
  recovery: null,
  canSend: true,
  canRetry: false,
};

function renderSession(snapshot: ChatSnapshot) {
  vi.mocked(useChatSnapshot).mockReturnValue(snapshot);
  return render(<ChatSession />);
}

function dispatchBeforeUnload(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("Chat session unsaved guest warning", () => {
  beforeEach(() => vi.mocked(useChatSnapshot).mockReset());
  afterEach(cleanup);

  it("prevents leaving when a guest has a transcript", () => {
    renderSession({
      ...emptySnapshot,
      messages: [
        {
          id: "guest-message",
          role: "user",
          content: "Keep this chat",
          timestamp: 1,
          status: "done",
        },
      ],
    });

    expect(dispatchBeforeUnload()).toBe(true);
  });

  it("does not warn for an empty guest chat", () => {
    renderSession(emptySnapshot);

    expect(dispatchBeforeUnload()).toBe(false);
  });

  it("does not warn for a signed-in chat", () => {
    renderSession({ ...emptySnapshot, userId: "account-1", messages: [] });

    expect(dispatchBeforeUnload()).toBe(false);
  });

  it("removes the warning after a guest signs in", () => {
    const { rerender } = renderSession({
      ...emptySnapshot,
      messages: [
        {
          id: "guest-message",
          role: "user",
          content: "Keep this chat",
          timestamp: 1,
          status: "done",
        },
      ],
    });

    vi.mocked(useChatSnapshot).mockReturnValue({
      ...emptySnapshot,
      userId: "account-1",
    });
    rerender(<ChatSession />);

    expect(dispatchBeforeUnload()).toBe(false);
  });
});
