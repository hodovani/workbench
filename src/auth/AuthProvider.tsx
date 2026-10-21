"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { AuthContext, type AuthContextValue } from "./context";
import { FirebaseAuthAdapter } from "./FirebaseAuthAdapter";
import type { AuthService, AuthUser } from "./types";

export interface AuthProviderProps {
  children: ReactNode;
  authService?: AuthService;
}

export function AuthProvider({ children, authService }: AuthProviderProps) {
  const service = useMemo(
    () => authService ?? new FirebaseAuthAdapter(auth, googleProvider),
    [authService],
  );

  const [user, setUser] = useState<AuthUser | null>(() =>
    service.getCurrentUser(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = service.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [service]);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await service.signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
      setError("Sign in failed. Please try again.");
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await service.signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      setError("Sign out failed. Please try again.");
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
