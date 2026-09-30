"use client";

import { useSyncExternalStore } from "react";
import { chatMediator } from "../ChatMediator";
import type { Message } from "../types";

const emptySnapshot: Message[] = [];

export function useThread(): Message[] {
  const store = chatMediator.getThreadStore();

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => emptySnapshot,
  );
}
