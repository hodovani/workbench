"use client";

import { useSyncExternalStore } from "react";
import { chatMediator } from "../ChatMediator";
import type { ChatSnapshot } from "../types";

const emptySnapshot: ChatSnapshot = {
  userId: null,
  threadId: null,
  threads: [],
  messages: [],
  phase: "idle",
  error: null,
  recovery: null,
  canSend: true,
  canRetry: false,
};

export function useChatSnapshot(): ChatSnapshot {
  return useSyncExternalStore(
    chatMediator.subscribeState,
    chatMediator.getSnapshot,
    () => emptySnapshot,
  );
}
