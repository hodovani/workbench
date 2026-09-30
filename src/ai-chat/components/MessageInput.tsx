"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useId,
  useRef,
  useState,
} from "react";
import { chatMediator } from "../ChatMediator";
import { useAppState } from "../hooks/useAppState";

export function MessageInput() {
  const [text, setText] = useState("");
  const { isBusy } = useAppState();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = useId();

  const isBlocked = !text.trim() || isBusy;

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    chatMediator.sendMessage(trimmed);
    setText("");

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
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
              ? "AI is responding..."
              : "Type your prompt... (Enter to send, Shift+Enter for new line)"
          }
          disabled={isBusy}
        />
      </p>
      <p>
        <button type="submit" disabled={isBlocked} aria-disabled={isBlocked}>
          {isBusy ? "Thinking..." : "Send"}
        </button>
      </p>
    </form>
  );
}
