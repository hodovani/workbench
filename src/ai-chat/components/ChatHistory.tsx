"use client";

import { useId } from "react";
import { chatMediator } from "../ChatMediator";
import { useChatSnapshot } from "../hooks/useChatSnapshot";

export function ChatHistory() {
  const { userId, threadId, threads, phase, recovery } = useChatSnapshot();
  const selectId = useId();
  if (!userId) return null;

  const disabled = phase !== "idle" || recovery !== null;
  return (
    <nav aria-label="Conversation history">
      <label htmlFor={selectId}>Saved chats</label>{" "}
      <select
        id={selectId}
        value={threadId ?? ""}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value)
            void chatMediator.selectThread(event.target.value);
          else chatMediator.newThread();
        }}
      >
        <option value="">New chat</option>
        {threads.map((thread) => (
          <option key={thread.id} value={thread.id}>
            {thread.title}
          </option>
        ))}
      </select>{" "}
      <button
        type="button"
        disabled={disabled}
        onClick={() => chatMediator.newThread()}
      >
        New chat
      </button>
    </nav>
  );
}
