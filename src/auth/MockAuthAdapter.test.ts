import { describe, expect, it } from "vitest";
import { MockAuthAdapter } from "./MockAuthAdapter";
import type { AuthUser } from "./types";

const user: AuthUser = { id: "u1", email: "a@b.dev", displayName: "A" };

describe("MockAuthAdapter (AuthService port contract)", () => {
  it("starts signed out by default", () => {
    expect(new MockAuthAdapter().getCurrentUser()).toBeNull();
  });

  it("can start already signed in", () => {
    expect(new MockAuthAdapter(user).getCurrentUser()).toEqual(user);
  });

  it("notifies a new subscriber with the current state immediately", () => {
    const adapter = new MockAuthAdapter(user);
    let seen: AuthUser | null = null;

    adapter.onAuthStateChanged((next) => {
      seen = next;
    });

    expect(seen).toEqual(user);
  });

  it("signs in a mock user and notifies subscribers", () => {
    const adapter = new MockAuthAdapter();
    let seen: AuthUser | null = null;
    adapter.onAuthStateChanged((next) => {
      seen = next;
    });

    return adapter.signInWithGoogle().then((signedIn) => {
      expect(signedIn.id).toBe("mock-user-123");
      expect(seen).toEqual(signedIn);
      expect(adapter.getCurrentUser()).toEqual(signedIn);
    });
  });

  it("signs out and clears the current user", () => {
    const adapter = new MockAuthAdapter(user);

    return adapter.signOut().then(() => {
      expect(adapter.getCurrentUser()).toBeNull();
    });
  });

  it("stops notifying after unsubscribe", () => {
    const adapter = new MockAuthAdapter();
    let calls = 0;
    const unsubscribe = adapter.onAuthStateChanged(() => {
      calls += 1;
    });

    unsubscribe();
    adapter.setUser(user);

    expect(calls).toBe(1);
  });

  it("notifies every subscriber on a change", () => {
    const adapter = new MockAuthAdapter();
    const seen: (AuthUser | null)[] = [];
    adapter.onAuthStateChanged((next) => seen.push(next));
    adapter.onAuthStateChanged((next) => seen.push(next));

    adapter.setUser(user);

    // Two immediate nulls from subscribing, then one per subscriber.
    expect(seen).toHaveLength(4);
    expect(seen.at(-1)).toEqual(user);
  });
});
