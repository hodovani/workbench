"use client";

import { useEffect } from "react";
import { useChatSnapshot } from "../hooks/useChatSnapshot";
import { useThreadSync } from "../hooks/useThreadSync";

export function ChatSession() {
  const snapshot = useChatSnapshot();
  useThreadSync();

  useEffect(() => {
    if (snapshot.userId || snapshot.messages.length === 0) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [snapshot.userId, snapshot.messages.length]);

  return null;
}
