# Guest-first portfolio chat: v1 design

Status: planning artifact; supersedes the mandatory-login/BYOK plan in chat.

## Purpose and constraints

Visitors can immediately try a real streaming AI chat. Google sign-in adds saved history; it is not a prerequisite for generation. This is a low-traffic, first-version portfolio, not a commercial chat platform.

- Use the owner's Gemini free-tier project through a small server-side proxy. Never send its secret to the browser. No paid fallback.
- Keep the Next.js static export and GitHub Pages frontend. Cloudflare Workers Free is the proposed streaming-proxy host, with the key in Worker secrets. The user has no Worker for this app; verify whether account setup is needed before launch. Provisioning is not complete. Do not enable a paid plan.
- Use the existing Gemini model initially, subject to verifying its free-tier availability in the actual project before launch.
- Keep Firebase Auth and Firestore, strict TypeScript, accessibility, and constructor injection where useful. Use zero application-authored CSS: native HTML controls, browser defaults, and normal document flow. No inline styles, CSS framework/reset, or JavaScript recreating CSS layout.
- Preserve all existing staged work and the ignored `meta/` curriculum. Existing tests are evidence to assess, not specifications to preserve blindly.
- Defer BYOK, usage dashboards, custom quota allocation, provider failover, performance tuning, chat deletion/renaming, response branching, code highlighting, and visual redesign.

## Conversation behavior

1. A guest starts with an empty in-memory conversation. Allocate a UUID on the first accepted prompt. Do not create empty Firestore records.
2. Guest messages remain in memory; reload loses them. Show a concise sign-in-to-save reminder and an unload warning for nonempty guest history where the browser supports it.
3. Signing in with a nonempty guest conversation saves that conversation under its existing UUID in the account. Never merge it into or overwrite an existing conversation. Keep the imported conversation selected.
4. Signing in with an empty guest conversation loads the most recently updated saved conversation, or an empty draft if none exists.
5. Import is idempotent: repeated auth events or retry after a lost acknowledgement use the same conversation and message IDs. A conflicting existing UUID with different content is an error, never permission to overwrite.
6. While import is pending or failed, retain the guest transcript, block generation and conversation switching, and offer save retry on failure. Do not claim that the transcript is saved before acknowledgement.
7. If sign-in completes during generation, invalidate and abort the guest stream; mark its response interrupted before import. Preserve received text for display, and offer retry after import. Late chunks cannot modify the imported conversation.
8. Bind the import to the account that initiated it. If that account disappears or changes, invalidate the operation and clear the visible transcript. A late completion must not save into or appear in another account. Explicit logout with unsaved data requires a discard confirmation; unexpected auth loss cannot guarantee recovery of unsaved data.
9. A minimal signed-in conversation list shows titles ordered by most recent update and permits reopening saved chats. Include New chat. Derive titles from the first prompt's first 60 characters; do not spend an AI call on titles.
10. Disable New chat and switching while generating or saving. A failed load offers retry without displaying another account's conversation. Logout clears account history from memory and returns to an empty guest chat.
11. Keep legacy `current` conversations readable and selectable. New conversations use UUIDs. No destructive migration.

## Saved chats: storage and native UI

Reuse the existing Firestore structure rather than introducing a separate list record or database:

```text
users/{uid}/threads/{threadId}                 title, createdAt, updatedAt
users/{uid}/threads/{threadId}/messages/{id}   role, content, timestamp, status
```

The document ID is the conversation identity; preserve existing redundant `id` fields for compatibility where present. The import marker described below is additional metadata on imported threads only.

- `listThreads(uid)` reads only that user's thread metadata, ordered by `updatedAt` descending, with ID as a deterministic tie-break. It does not fetch message subcollections.
- Load messages only for the selected conversation. Keep the selected ID and loaded metadata in React/application memory; no separate localStorage cache or globally shared list.
- Read the list after authentication. After acknowledged imports/saves, update the matching in-memory metadata entry and reorder it. Reuse the same entry on retries. Cross-tab live subscriptions, pagination, and cache frameworks are deferred.
- Render a `<label>` and native `<select>` named "Saved chats", with one `<option>` per thread, followed by a native "New chat" button. Place these above the conversation in normal document flow; do not build a sidebar or custom dropdown.
- Include an empty-value "New chat" option for an unsaved draft. Changing the selection loads that conversation; preserve the selected target and show a retryable load error if loading fails. Disable navigation while generation/save/import is in progress or an unsaved exchange needs recovery.
- Use native `disabled`, a `<progress>` with an accessible label while loading, and plain error text with a Retry button. Guests see the sign-in reminder instead of saved-chat controls.
- Render plain message text safely as React text nodes with `<br>` between lines. Do not introduce Markdown/HTML parsing or CSS to preserve line breaks. Long unbroken tokens may overflow under browser defaults; do not add a layout workaround unless this becomes a demonstrated requirement.
- Remove the existing global stylesheet/import as part of the implementation task, including sizing and wrapping rules. Do not replace the styles with DOM measurement scripts or obsolete presentational HTML attributes.

## Durability and recovery

- Signed-in sends save the prompt and pending response atomically before generation starts. Guests generate immediately without Firestore.
- Save final/error responses using the same message IDs. A failed save preserves the visible result and offers Retry saving; it must not regenerate.
- Reloaded pending responses become interrupted and can be retried. Retry derives its prompt from stored messages rather than an in-memory last-prompt variable.
- Only the latest failed/interrupted response is retryable. Retry replaces that response, not the prompt or the conversation.
- Partial streamed text need not survive page termination. Signed-in prompts acknowledged by Firestore must survive.
- Serialize operations within the current tab. Cross-tab generation coordination is outside v1.

## Architecture and boundaries

Keep Ports and Adapters for external auth, storage, and generation; retain the mediator and external store while correcting lifecycle behavior. React Context and `useSyncExternalStore` already provide the required context/subscription mechanisms. Remove duplicate internal interfaces and the obsolete browser-key UI only after behavioral tests protect consumers.

The browser sends validated role/content history to a POST-only Worker endpoint. The Worker fixes the model and system instruction, caps input and output, reads its secret, and returns a normalized stream of delta/done/error events. It accepts neither a client-selected provider URL nor a client-selected model/key. Limit the request body to 64 KiB, history to 100 user/assistant messages, and output to 1,024 tokens. Reject oversized input visibly rather than silently discarding history. These are request boundaries, not a custom traffic-management system.

Use an explicit frontend-origin allowlist for browser interoperability; do not describe CORS as authentication or abuse prevention. Map quota exhaustion to a recoverable unavailable state, upstream failure to a retryable service error, and invalid input to a validation error. Never return upstream secrets or raw sensitive errors. Do not log prompt bodies or credentials. Public callers can consume the free allowance; this is an accepted v1 availability limit.

Repository capabilities: list thread metadata, load a thread, import a guest transcript idempotently, and atomically save a prompt/response exchange. Keep user ID and thread ID explicit. Import creates a thread plus its messages in one transaction; accept at most 100 messages per imported transcript, consistent with the generation boundary. Freeze the import payload when sign-in begins. Persist an immutable `guestImportFingerprint` on the thread: SHA-256 of the canonical original thread/message payload. An existing matching fingerprint makes a repeated import succeed without rewriting later account changes. An existing thread with a missing or different fingerprint rejects the import rather than overwriting it. Ordinary exchange saves preserve this marker.

## Launch limits

Local tests use emulators and deterministic generation, not paid calls. Production launch separately requires verifying the actual free-tier project, Worker secrets/origins, Firebase rules and authorized domains, and applicable Gemini data-use terms. No deployment is authorized by writing this document.
