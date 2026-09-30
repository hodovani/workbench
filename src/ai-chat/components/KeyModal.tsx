"use client";

import { type FormEvent, useId, useState } from "react";
import { chatMediator } from "../ChatMediator";

export function KeyModal() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useId();
  const inputId = useId();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError("API key cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const success = await chatMediator.saveApiKey(trimmed);
    if (!success) {
      setError("Failed to save key. Please check your input.");
      setIsSubmitting(false);
    }
  };

  return (
    <dialog open aria-labelledby={titleId}>
      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend id={titleId}>
            <strong>Gemini API Key Required</strong>
          </legend>
          <p>
            Enter your Google Gemini API key to begin. Stored only in your local
            browser session.
          </p>

          <p>
            <label htmlFor={inputId}>
              <strong>API Key:</strong>{" "}
            </label>
            <input
              id={inputId}
              type="password"
              size={35}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              required
            />
          </p>

          {error && (
            <p role="alert">
              <mark>{error}</mark>
            </p>
          )}

          <p>
            <button type="submit" disabled={isSubmitting || !apiKey.trim()}>
              {isSubmitting ? "Saving..." : "Start Chatting"}
            </button>{" "}
            <small>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get a free key
              </a>
            </small>
          </p>
        </fieldset>
      </form>
    </dialog>
  );
}
