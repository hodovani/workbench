// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mediator = vi.hoisted(() => ({
  sendMessage: vi.fn(async () => true),
  retryLastMessage: vi.fn(async () => {}),
  clearApiKey: vi.fn(),
}));
const state = vi.hoisted(() => ({ phase: "idle", canSend: true }));

vi.mock("../ChatMediator", () => ({ chatMediator: mediator }));
vi.mock("../hooks/useChatSnapshot", () => ({
  useChatSnapshot: () => state,
}));

const { MessageInput } = await import("./MessageInput");

const button = (name: RegExp) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;
const textbox = () => screen.getByRole("textbox") as HTMLTextAreaElement;

describe("MessageInput", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.phase = "idle";
    state.canSend = true;
    mediator.sendMessage.mockResolvedValue(true);
  });

  it("blocks submit while the input is empty", () => {
    render(<MessageInput />);
    expect(button(/Send/).disabled).toBe(true);
  });

  it("sends the trimmed message and clears the input", async () => {
    const user = userEvent.setup();
    render(<MessageInput />);

    await user.type(textbox(), "  hello  ");
    await user.click(button(/Send/));

    expect(mediator.sendMessage).toHaveBeenCalledWith("hello");
    expect(textbox().value).toBe("");
  });

  it("keeps the draft when the mediator rejects the send", async () => {
    const user = userEvent.setup();
    mediator.sendMessage.mockResolvedValueOnce(false);
    render(<MessageInput />);
    await user.type(textbox(), "keep this draft");
    await user.click(button(/Send/));
    expect(textbox().value).toBe("keep this draft");
  });

  it("sends on Enter", async () => {
    const user = userEvent.setup();
    render(<MessageInput />);

    await user.type(textbox(), "hi{Enter}");

    expect(mediator.sendMessage).toHaveBeenCalledWith("hi");
  });

  it("keeps a newline on Shift+Enter instead of sending", async () => {
    const user = userEvent.setup();
    render(<MessageInput />);

    await user.type(textbox(), "a{Shift>}{Enter}{/Shift}b");

    expect(mediator.sendMessage).not.toHaveBeenCalled();
  });

  it("locks input while the AI is responding", () => {
    state.phase = "streaming";
    state.canSend = false;
    render(<MessageInput />);

    expect(textbox().disabled).toBe(true);
    expect(button(/Thinking/).disabled).toBe(true);
  });
});
