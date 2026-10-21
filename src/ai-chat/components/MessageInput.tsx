"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useId,
  useRef,
  useState,
} from "react";
import { chatMediator } from "../ChatMediator";
import { useChatSnapshot } from "../hooks/useChatSnapshot";

export function MessageInput() {
  const [text, setText] = useState("");
  const { phase, canSend } = useChatSnapshot();
  const isBusy = phase !== "idle";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = useId();

  const isBlocked = !text.trim() || !canSend;
  const activity =
    phase === "streaming"
      ? "Thinking..."
      : phase === "saving"
        ? "Saving..."
        : phase === "loading"
          ? "Loading..."
          : phase === "importing"
            ? "Importing..."
            : "Send";

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    void chatMediator.sendMessage(trimmed).then((accepted) => {
      if (accepted) setText("");
      textareaRef.current?.focus();
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p>
        <label htmlFor={textareaId}>
          <strong>Your message:</strong>
        </label>
      </p>
      <p>
        <textarea
          id={textareaId}
          ref={textareaRef}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isBusy
              ? activity
              : "Type your prompt... (Enter to send, Shift+Enter for new line)"
          }
          disabled={!canSend}
        />
      </p>
      <p>
        <button type="submit" disabled={isBlocked}>
          {activity}
        </button>
      </p>
    </form>
  );
}
