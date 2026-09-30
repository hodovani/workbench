"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { chatMediator } from "../ChatMediator";
import { useThread } from "../hooks/useThread";
import type { Message } from "../types";

export function MessageList() {
  const messages = useThread();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const messageRefs = useRef<(HTMLElement | null)[]>([]);

  const messageCount = messages.length;

  useEffect(() => {
    if (messageCount > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount]);

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, messages.length - 1);
      setFocusedIndex(nextIndex);
      messageRefs.current[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      setFocusedIndex(prevIndex);
      messageRefs.current[prevIndex]?.focus();
    }
  };

  if (messages.length === 0) {
    return (
      <section aria-label="Conversation Thread">
        <p>
          <em>No messages yet. Type a prompt below to start.</em>
        </p>
      </section>
    );
  }

  return (
    <section role="feed" aria-label="Conversation Thread">
      {messages.map((message: Message, index: number) => {
        const isUser = message.role === "user";
        const isLoading = message.status === "loading";
        const isError = message.status === "error";
        const isStreaming = message.status === "streaming";

        return (
          <article
            key={message.id}
            ref={(el) => {
              messageRefs.current[index] = el;
            }}
            tabIndex={
              focusedIndex === index || (focusedIndex === null && index === 0)
                ? 0
                : -1
            }
            onKeyDown={(e) => handleKeyDown(e, index)}
            aria-label={`${isUser ? "You" : "Gemini AI"}: ${message.content || (isLoading ? "Thinking..." : "")}`}
          >
            <header>
              <strong>{isUser ? "You" : "Gemini AI"}:</strong>
            </header>

            {isLoading ? (
              <p aria-live="polite">
                <em>...</em>
              </p>
            ) : (
              <pre aria-live={isStreaming ? "polite" : "off"}>
                {message.content}
              </pre>
            )}

            {isError && (
              <p role="alert">
                <mark>Error generating response.</mark>{" "}
                <button
                  type="button"
                  onClick={() => chatMediator.retryLastMessage()}
                >
                  Retry
                </button>
              </p>
            )}

            <hr />
          </article>
        );
      })}
      <div ref={bottomRef} />
    </section>
  );
}
