"use client";

import { useEffect } from "react";
import { chatMediator } from "@/ai-chat/ChatMediator";
import { ChatHistory } from "@/ai-chat/components/ChatHistory";
import { MessageInput } from "@/ai-chat/components/MessageInput";
import { MessageList } from "@/ai-chat/components/MessageList";
import { useChatSnapshot } from "@/ai-chat/hooks/useChatSnapshot";
import { useThreadSync } from "@/ai-chat/hooks/useThreadSync";

export default function Home() {
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

  return (
    <main>
      <header>
        <h1>Chat</h1>
      </header>

      <ChatHistory />
      {!snapshot.userId && snapshot.messages.length > 0 && (
        <p>Sign in to save this conversation.</p>
      )}

      {snapshot.error && (
        <p role="alert">
          {snapshot.error}
          {snapshot.recovery === "save" && (
            <button type="button" onClick={() => void chatMediator.retrySave()}>
              Retry saving
            </button>
          )}
          {snapshot.recovery === "load" && (
            <button type="button" onClick={() => void chatMediator.retryLoad()}>
              Retry loading
            </button>
          )}
        </p>
      )}

      <hr />

      <MessageList />

      <hr />

      <MessageInput />
    </main>
  );
}
