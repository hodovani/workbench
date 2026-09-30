"use client";

import { useSyncExternalStore } from "react";
import { chatMediator } from "../ChatMediator";
import type { AppState } from "../types";

export function useAppState(): { appState: AppState; isBusy: boolean } {
  const appState = useSyncExternalStore(
    chatMediator.subscribeState,
    chatMediator.getAppState,
    () => "checking" as AppState,
  );

  const isBusy = chatMediator.isBusy();

  return { appState, isBusy };
}
