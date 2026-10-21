// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MockAuthAdapter } from "./MockAuthAdapter";
import type { AuthUser } from "./types";

const user: AuthUser = { id: "u1", email: "a@b.dev", displayName: "A" };

// The provider imports the Firebase singleton at module scope; stub it so tests
// never reach for real credentials or a real SDK.
vi.mock("@/lib/firebase", () => ({ auth: {}, googleProvider: {}, db: {} }));

const { AuthProvider } = await import("./AuthProvider");
const { useAuth } = await import("./useAuth");

// biome-ignore lint/style/useComponentExportOnlyModules: noExportsInTest forbids exporting from a test file, and that rule wins
const Probe = () => {
  const {
    user: current,
    loading,
    signInWithGoogle,
    signOut,
    error,
  } = useAuth();
  return (
    <div>
      <p>{loading ? "loading" : (current?.displayName ?? "signed out")}</p>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => void signInWithGoogle()}>
        in
      </button>
      <button type="button" onClick={() => void signOut()}>
        out
      </button>
    </div>
  );
};

describe("AuthProvider + useAuth", () => {
  afterEach(cleanup);

  it("throws a useful error when used outside the provider", () => {
    // React logs the thrown error; silence it for this expected case.
    const error = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(/must be used within/i);
    } finally {
      console.error = error;
    }
  });

  it("starts from the adapter's current user", () => {
    render(
      <AuthProvider authService={new MockAuthAdapter(user)}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("reflects a sign-in from the adapter", async () => {
    const user$ = userEvent.setup();
    const service = new MockAuthAdapter();
    render(
      <AuthProvider authService={service}>
        <Probe />
      </AuthProvider>,
    );

    await user$.click(screen.getByRole("button", { name: "in" }));

    expect(await screen.findByText("Mock Engineer")).toBeTruthy();
  });

  it("reflects a sign-out from the adapter", async () => {
    const user$ = userEvent.setup();
    render(
      <AuthProvider authService={new MockAuthAdapter(user)}>
        <Probe />
      </AuthProvider>,
    );

    await user$.click(screen.getByRole("button", { name: "out" }));

    expect(await screen.findByText("signed out")).toBeTruthy();
  });

  it("does not crash the tree when a sign-in fails", async () => {
    const user$ = userEvent.setup();
    const error = console.error;
    console.error = () => {};
    const service = new MockAuthAdapter();
    vi.spyOn(service, "signInWithGoogle").mockRejectedValue(
      new Error("popup closed"),
    );

    try {
      render(
        <AuthProvider authService={service}>
          <Probe />
        </AuthProvider>,
      );

      await user$.click(screen.getByRole("button", { name: "in" }));

      expect(screen.getByText("signed out")).toBeTruthy();
    } finally {
      console.error = error;
    }
  });

  it("shows a recoverable sign-in error and keeps the guest action available", async () => {
    const user$ = userEvent.setup();
    const service = new MockAuthAdapter();
    vi.spyOn(service, "signInWithGoogle").mockRejectedValue(
      new Error("popup closed"),
    );
    render(
      <AuthProvider authService={service}>
        <Probe />
      </AuthProvider>,
    );

    await user$.click(screen.getByRole("button", { name: "in" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Sign in failed. Please try again.",
    );
    expect(screen.getByText("signed out")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "in" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
