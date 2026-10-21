// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: { id: "u1", email: "user@example.test", displayName: "User" },
  loading: false,
  error: null as string | null,
  signInWithGoogle: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
}));
const mediator = vi.hoisted(() => ({ hasUnsavedWork: vi.fn(() => true) }));
vi.mock("@/auth", () => ({ useAuth: () => auth }));
vi.mock("@/ai-chat/ChatMediator", () => ({ chatMediator: mediator }));

const { WorkbenchNavbar } = await import("./WorkbenchNavbar");

describe("WorkbenchNavbar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    auth.user = { id: "u1", email: "user@example.test", displayName: "User" };
  });

  it("keeps the account and unsaved chat when sign-out discard is canceled", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<WorkbenchNavbar />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(confirm).toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("signs out after the user confirms discarding unsaved chat", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<WorkbenchNavbar />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});
