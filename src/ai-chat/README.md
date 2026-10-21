# Chat behavior

Guests can send messages immediately. Their conversation lives in memory and is
cleared on reload. Signing in imports a non-empty guest conversation as its own
saved thread; it does not replace existing account history.

Signed-in prompts and pending responses are saved before generation starts.
Completed responses update the same message ID. A failed save can be retried
without generating a second response. Saved chats are listed by metadata and
loaded only when selected.

The browser calls `NEXT_PUBLIC_CHAT_API_URL`. A Cloudflare Worker holds
`GEMINI_API_KEY`, validates the request, fixes the model and output limit, and
streams plain-text deltas. The browser bundle must never contain the shared key.
The v1 model is `gemini-3.5-flash-lite`; free-tier quota exhaustion is reported
without trying a paid model.

The UI uses semantic HTML and browser defaults. There is no CSS. Conversation
content is rendered as text, including HTML-looking input.

Focused behavior tests are beside each module. Run `pnpm test` for the fast suite,
`pnpm test:worker` for the Worker protocol, and `pnpm test:integration` for the
Firestore emulator and security rules. See [TESTING.md](../../TESTING.md) for
the full verification matrix.
