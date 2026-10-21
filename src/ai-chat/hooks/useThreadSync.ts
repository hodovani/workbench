"use client";

import { useEffect } from "react";
import { useAuth } from "@/auth";
import { db } from "@/lib/firebase";
import { FirestoreChatRepository } from "@/storage";
import { chatMediator } from "../ChatMediator";

// The adapter holds no state, so one instance serves every user.
const repository = new FirestoreChatRepository(db);

/**
 * Keeps the mediator bound to the signed-in user's thread. Detaching on sign-out
 * is what stops one user's messages appearing for the next user.
 */
export function useThreadSync(): void {
  const { user, loading } = useAuth();
  const userId = user?.id;

  useEffect(() => () => chatMediator.release(), []);

  useEffect(() => {
    if (loading) return;

    if (!userId) {
      if (chatMediator.getSnapshot().userId !== null) chatMediator.detach();
      return;
    }

    chatMediator.attach(repository, userId).catch((error: unknown) => {
      console.error("Failed to load thread:", error);
    });
  }, [userId, loading]);
}
