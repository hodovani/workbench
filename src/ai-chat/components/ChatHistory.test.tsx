// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mediator = vi.hoisted(() => ({
  newThread: vi.fn(() => true),
  selectThread: vi.fn(async () => true),
}));
const snapshot = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  threadId: "thread-b",
  threads: [
    { id: "thread-b", title: "Second chat", createdAt: 1, updatedAt: 3 },
    { id: "thread-a", title: "First chat", createdAt: 1, updatedAt: 2 },
  ],
  messages: [],
  phase: "idle",
  error: null,
  recovery: null,
  canSend: true,
  canRetry: false,
}));

vi.mock("../ChatMediator", () => ({ chatMediator: mediator }));
vi.mock("../hooks/useChatSnapshot", () => ({
  useChatSnapshot: () => snapshot,
}));

const { ChatHistory } = await import("./ChatHistory");

describe("ChatHistory", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    snapshot.userId = "user-1";
  });

  it("offers saved chats in the native selector with the active value", () => {
    render(<ChatHistory />);
    const select = screen.getByRole("combobox", {
      name: "Saved chats",
    }) as HTMLSelectElement;
    expect(select.value).toBe("thread-b");
    expect(
      Array.from(select.options).map((option) => option.textContent),
    ).toEqual(["New chat", "Second chat", "First chat"]);
  });

  it("opens the selected conversation and creates a new draft", async () => {
    const user = userEvent.setup();
    render(<ChatHistory />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Saved chats" }),
      "thread-a",
    );
    await user.click(screen.getByRole("button", { name: "New chat" }));
    expect(mediator.selectThread).toHaveBeenCalledWith("thread-a");
    expect(mediator.newThread).toHaveBeenCalledOnce();
  });

  it("does not show a selector to guests", () => {
    snapshot.userId = null;
    render(<ChatHistory />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
