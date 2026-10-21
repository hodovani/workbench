import {
  type Auth,
  type GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import type { AuthService, AuthStateListener, AuthUser } from "./types";

/**
 * Concrete adapter for Firebase Authentication.
 * Encapsulates all Firebase-specific logic and maps to domain AuthUser.
 */
export class FirebaseAuthAdapter implements AuthService {
  private auth: Auth;
  private googleProvider: GoogleAuthProvider;

  constructor(auth: Auth, googleProvider: GoogleAuthProvider) {
    this.auth = auth;
    this.googleProvider = googleProvider;
  }

  public getCurrentUser(): AuthUser | null {
    return this.mapUser(this.auth.currentUser);
  }

  public onAuthStateChanged(listener: AuthStateListener): () => void {
    return onAuthStateChanged(this.auth, (firebaseUser) => {
      listener(this.mapUser(firebaseUser));
    });
  }

  public async signInWithGoogle(): Promise<AuthUser> {
    const credential = await signInWithPopup(this.auth, this.googleProvider);
    const user = this.mapUser(credential.user);
    if (!user) {
      throw new Error("Failed to authenticate with Google.");
    }
    return user;
  }

  public async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  private mapUser(user: User | null): AuthUser | null {
    if (!user) return null;
    return {
      id: user.uid,
      email: user.email,
      displayName: user.displayName,
    };
  }
}
