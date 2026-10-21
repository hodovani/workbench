"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { chatMediator } from "../ChatMediator";
import { useChatSnapshot } from "../hooks/useChatSnapshot";

export function MessageList() {
  const snapshot = useChatSnapshot();
  const messages = snapshot.messages;
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
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isLoading = message.status === "loading";
        const isError = message.status === "error";
        const isStreaming = message.status === "streaming";
        const canRetry = snapshot.canRetry && index === messages.length - 1;

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
                <progress aria-label="Waiting for Gemini" />
              </p>
            ) : (
              <pre aria-live={isStreaming ? "polite" : "off"}>
                {message.content}
              </pre>
            )}

            {(isError || message.status === "interrupted") && (
              <p role="alert">
                <mark>
                  {message.content === "quota_unavailable"
                    ? "The shared free-tier quota is temporarily unavailable. Please try again later."
                    : message.status === "interrupted"
                      ? "Response interrupted."
                      : "Error generating response."}
                </mark>{" "}
                {canRetry && (
                  <button
                    type="button"
                    onClick={() => void chatMediator.retryLastMessage()}
                  >
                    Retry
                  </button>
                )}
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
