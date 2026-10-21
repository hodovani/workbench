import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(async () => undefined),
}));

const { onAuthStateChanged, signInWithPopup } = await import("firebase/auth");
const { FirebaseAuthAdapter } = await import("./FirebaseAuthAdapter");

const firebaseUser = {
  uid: "u1",
  email: "a@b.dev",
  displayName: "A",
  photoURL: null,
};

describe("FirebaseAuthAdapter", () => {
  const authState: { currentUser: unknown } = { currentUser: null };

  beforeEach(() => {
    vi.clearAllMocks();
    authState.currentUser = null;
  });

  it("returns null when there is no signed-in user", () => {
    const adapter = new FirebaseAuthAdapter(authState as never, {} as never);
    expect(adapter.getCurrentUser()).toBeNull();
  });

  it("maps the Firebase user onto the domain model", () => {
    authState.currentUser = firebaseUser;
    const adapter = new FirebaseAuthAdapter(authState as never, {} as never);

    expect(adapter.getCurrentUser()).toEqual({
      id: "u1",
      email: "a@b.dev",
      displayName: "A",
    });
  });

  it("forwards auth state changes to the domain listener", () => {
    const adapter = new FirebaseAuthAdapter(authState as never, {} as never);
    let emit: (user: unknown) => void = () => {};
    vi.mocked(onAuthStateChanged).mockImplementation((_a, cb) => {
      emit = cb as typeof emit;
      return () => {};
    });

    const seen: unknown[] = [];
    adapter.onAuthStateChanged((user) => seen.push(user));
    emit(firebaseUser);

    expect(seen).toEqual([{ id: "u1", email: "a@b.dev", displayName: "A" }]);
  });

  it("returns the unsubscribe function so listeners do not leak", () => {
    const adapter = new FirebaseAuthAdapter(authState as never, {} as never);
    const unsubscribe = vi.fn();
    vi.mocked(onAuthStateChanged).mockReturnValue(unsubscribe);

    expect(adapter.onAuthStateChanged(() => {})).toBe(unsubscribe);
  });

  it("signs in with Google and maps the credential user", async () => {
    const adapter = new FirebaseAuthAdapter(authState as never, {} as never);
    vi.mocked(signInWithPopup).mockResolvedValue({
      user: firebaseUser,
    } as never);

    await expect(adapter.signInWithGoogle()).resolves.toEqual({
      id: "u1",
      email: "a@b.dev",
      displayName: "A",
    });
  });

  it("throws when the credential carries no user", async () => {
    const adapter = new FirebaseAuthAdapter(authState as never, {} as never);
    vi.mocked(signInWithPopup).mockResolvedValue({ user: null } as never);

    await expect(adapter.signInWithGoogle()).rejects.toThrow(
      "Failed to authenticate with Google.",
    );
  });
});
