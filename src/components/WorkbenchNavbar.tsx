"use client";

import { chatMediator } from "@/ai-chat/ChatMediator";
import { useAuth } from "@/auth";

export function WorkbenchNavbar() {
  const { user, loading, signInWithGoogle, signOut, error } = useAuth();

  return (
    <header>
      <strong>Workbench</strong>
      <hr />
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>
          <small>Loading...</small>
        </p>
      ) : user ? (
        <p>
          {user.displayName || user.email}{" "}
          <button
            type="button"
            onClick={() => {
              if (
                !chatMediator.hasUnsavedWork() ||
                window.confirm(
                  "Sign out and discard this unsaved conversation?",
                )
              ) {
                void signOut();
              }
            }}
          >
            Sign out
          </button>
        </p>
      ) : (
        <p>
          <button type="button" onClick={signInWithGoogle}>
            Sign in with Google
          </button>
        </p>
      )}
    </header>
  );
}
