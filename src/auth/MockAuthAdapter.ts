import type { AuthService, AuthStateListener, AuthUser } from "./types";

/**
 * Mock Auth Adapter for zero-dependency unit tests, storybooks, and offline development.
 */
export class MockAuthAdapter implements AuthService {
  private currentUser: AuthUser | null;
  private listeners: Set<AuthStateListener> = new Set();

  constructor(initialUser: AuthUser | null = null) {
    this.currentUser = initialUser;
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public onAuthStateChanged(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    // Immediately notify listener of current state
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async signInWithGoogle(): Promise<AuthUser> {
    const mockUser: AuthUser = {
      id: "mock-user-123",
      email: "mock.user@workbench.dev",
      displayName: "Mock Engineer",
    };
    this.setUser(mockUser);
    return mockUser;
  }

  public async signOut(): Promise<void> {
    this.setUser(null);
  }

  // Test helper to simulate user state changes
  public setUser(user: AuthUser | null): void {
    this.currentUser = user;
    this.listeners.forEach((listener) => {
      listener(user);
    });
  }
}
