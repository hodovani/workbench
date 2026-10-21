// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/auth";
import { MockAuthAdapter } from "@/auth/MockAuthAdapter";
import type { AuthService, AuthUser } from "@/auth/types";
import { chatMediator } from "../ChatMediator";
import { useThreadSync } from "./useThreadSync";

vi.mock("@/lib/firebase", () => ({ auth: {}, googleProvider: {}, db: {} }));

const user: AuthUser = { id: "u1", email: "a@b.dev", displayName: "A" };

/** Never invokes the listener, so AuthProvider stays in its loading state. */
const silentService: AuthService = {
  getCurrentUser: () => null,
  onAuthStateChanged: () => () => {},
  signInWithGoogle: async () => user,
  signOut: async () => {},
};

const wrapper = (service: AuthService) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider authService={service}>{children}</AuthProvider>;
  };

describe("useThreadSync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("binds the mediator to the signed-in user", async () => {
    const attach = vi.spyOn(chatMediator, "attach").mockResolvedValue();
    vi.spyOn(chatMediator, "detach").mockImplementation(() => {});

    renderHook(() => useThreadSync(), {
      wrapper: wrapper(new MockAuthAdapter(user)),
    });

    await waitFor(() => expect(attach).toHaveBeenCalled());
    expect(attach.mock.calls[0]?.[1]).toBe("u1");
  });

  it("clears the thread when the user signs out", async () => {
    const attach = vi.spyOn(chatMediator, "attach").mockResolvedValue();
    vi.spyOn(chatMediator, "getSnapshot").mockReturnValue({
      ...chatMediator.getSnapshot(),
      userId: "u1",
    });
    const detach = vi
      .spyOn(chatMediator, "detach")
      .mockImplementation(() => {});
    const service = new MockAuthAdapter(user);

    renderHook(() => useThreadSync(), { wrapper: wrapper(service) });
    await waitFor(() => expect(attach).toHaveBeenCalled());

    service.setUser(null);

    await waitFor(() => expect(detach).toHaveBeenCalled());
  });

  it("preserves a guest conversation when initial auth resolves as signed out", async () => {
    const store = chatMediator.getThreadStore();
    store.hydrate([
      {
        id: "guest",
        role: "user",
        content: "keep me",
        timestamp: 1,
        status: "done",
      },
    ]);
    const detach = vi.spyOn(chatMediator, "detach");
    renderHook(() => useThreadSync(), {
      wrapper: wrapper(new MockAuthAdapter()),
    });
    expect(detach).not.toHaveBeenCalled();
    expect(store.getSnapshot().map(({ content }) => content)).toEqual([
      "keep me",
    ]);
    store.hydrate([]);
  });

  it("waits for auth to resolve before binding anything", () => {
    const attach = vi.spyOn(chatMediator, "attach").mockResolvedValue();
    const detach = vi
      .spyOn(chatMediator, "detach")
      .mockImplementation(() => {});

    renderHook(() => useThreadSync(), { wrapper: wrapper(silentService) });

    expect(attach).not.toHaveBeenCalled();
    expect(detach).not.toHaveBeenCalled();
  });

  it("releases in-flight generation when the page unmounts", async () => {
    const attach = vi.spyOn(chatMediator, "attach").mockResolvedValue();
    const release = vi
      .spyOn(chatMediator, "release")
      .mockImplementation(() => {});
    vi.spyOn(chatMediator, "detach").mockImplementation(() => {});
    const hook = renderHook(() => useThreadSync(), {
      wrapper: wrapper(new MockAuthAdapter(user)),
    });
    await waitFor(() => expect(attach).toHaveBeenCalled());
    const releasesBeforeUnmount = release.mock.calls.length;
    hook.unmount();
    expect(release).toHaveBeenCalledTimes(releasesBeforeUnmount + 1);
  });

  it("reports a failed load instead of throwing", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.spyOn(chatMediator, "attach").mockRejectedValue(new Error("offline"));
    vi.spyOn(chatMediator, "detach").mockImplementation(() => {});

    renderHook(() => useThreadSync(), {
      wrapper: wrapper(new MockAuthAdapter(user)),
    });

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to load thread:",
        expect.any(Error),
      ),
    );
  });
});
