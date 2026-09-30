"use client";

import { useEffect } from "react";
import { chatMediator } from "@/ai-chat/ChatMediator";
import { KeyModal } from "@/ai-chat/components/KeyModal";
import { MessageInput } from "@/ai-chat/components/MessageInput";
import { MessageList } from "@/ai-chat/components/MessageList";
import { ACTIVE_CHAT_MODEL } from "@/ai-chat/GeminiStreamStrategy";
import { useAppState } from "@/ai-chat/hooks/useAppState";

export default function Home() {
  const { appState } = useAppState();

  useEffect(() => {
    chatMediator.init();
  }, []);

  if (appState === "checking") {
    return (
      <main>
        <p>
          <em>Initializing AI Chat...</em>
        </p>
      </main>
    );
  }

  if (appState === "nokey") {
    return (
      <main>
        <KeyModal />
      </main>
    );
  }

  return (
    <main>
      <header>
        <h1>AI Chat</h1>
        <p>
          <small>Powered by {ACTIVE_CHAT_MODEL}</small>
          {" | "}
          <button type="button" onClick={() => chatMediator.clearApiKey()}>
            Change API Key
          </button>
        </p>
      </header>

      <hr />

      <MessageList />

      <hr />

      <MessageInput />
    </main>
  );
}
