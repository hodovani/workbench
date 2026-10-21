// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatMediator } from "../ChatMediator";
import type { Message } from "../types";
import { MessageList } from "./MessageList";

// jsdom implements no scrolling; the component calls this to follow the stream.
Element.prototype.scrollIntoView = vi.fn();

const message = (
  id: string,
  role: "user" | "assistant",
  content: string,
  status: Message["status"] = "done",
): Message => ({ id, role, content, timestamp: 1, status });

describe("MessageList", () => {
  const store = chatMediator.getThreadStore();

  beforeEach(() => {
    vi.spyOn(chatMediator, "retryLastMessage").mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    store.hydrate([]);
  });

  it("prompts the user when the thread is empty", () => {
    render(<MessageList />);
    expect(screen.getByText(/No messages yet/i)).toBeTruthy();
  });

  it("renders each message with its author", () => {
    store.hydrate([
      message("m1", "user", "what is ports and adapters?"),
      message("m2", "assistant", "a hexagonal pattern"),
    ]);

    render(<MessageList />);

    expect(screen.getByText("what is ports and adapters?")).toBeTruthy();
    expect(screen.getByText("a hexagonal pattern")).toBeTruthy();
  });

  it("renders messages when the mediator store updates after mount", () => {
    store.hydrate([]);
    render(<MessageList />);

    act(() => store.appendMessage(message("live", "assistant", "new reply")));

    expect(screen.getByText("new reply")).toBeTruthy();
  });

  it("shows a loading indicator instead of empty content", () => {
    store.hydrate([]);
    store.appendMessage(message("m1", "assistant", "", "loading"));

    render(<MessageList />);

    expect(screen.getByLabelText("Waiting for Gemini")).toBeTruthy();
  });

  it("offers retry on a failed response", async () => {
    const user = userEvent.setup();
    store.hydrate([message("m1", "assistant", "boom", "error")]);

    render(<MessageList />);
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(chatMediator.retryLastMessage).toHaveBeenCalled();
  });

  it("keeps HTML-looking text inert and offers retry for an interrupted response", async () => {
    const user = userEvent.setup();
    store.hydrate([
      message("p1", "user", "show <script>alert(1)</script>"),
      message("r1", "assistant", "partial answer", "interrupted"),
    ]);
    render(<MessageList />);
    expect(screen.getByText("show <script>alert(1)</script>")).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(chatMediator.retryLastMessage).toHaveBeenCalled();
  });

  it("explains shared free-tier quota exhaustion", () => {
    store.hydrate([message("r1", "assistant", "quota_unavailable", "error")]);
    render(<MessageList />);
    expect(screen.getByText(/shared free-tier quota/)).toBeTruthy();
  });

  it("moves focus between messages with the arrow keys", async () => {
    const user = userEvent.setup();
    store.hydrate([
      message("m1", "user", "first"),
      message("m2", "assistant", "second"),
    ]);

    render(<MessageList />);
    screen.getByLabelText("You: first").focus();

    await user.keyboard("{ArrowDown}");

    expect(document.activeElement).toBe(
      screen.getByLabelText("Gemini AI: second"),
    );
  });

  it("stops at the first message when arrowing up", async () => {
    const user = userEvent.setup();
    store.hydrate([
      message("m1", "user", "first"),
      message("m2", "assistant", "second"),
    ]);

    render(<MessageList />);
    screen.getByLabelText("Gemini AI: second").focus();

    await user.keyboard("{ArrowUp}");

    expect(document.activeElement).toBe(screen.getByLabelText("You: first"));
  });
});
