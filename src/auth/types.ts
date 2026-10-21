export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

export type AuthStateListener = (user: AuthUser | null) => void;

/**
 * Port (Contract): Any auth provider must satisfy this interface.
 * UI components and features only interact through this abstraction.
 */
export interface AuthService {
  getCurrentUser(): AuthUser | null;
  onAuthStateChanged(listener: AuthStateListener): () => void;
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
}
