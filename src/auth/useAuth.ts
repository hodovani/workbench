"use client";

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "./context";

/**
 * Custom hook to consume the AuthContext.
 * Throws an error if used outside an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
