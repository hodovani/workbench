# Architecture notes

This app uses a few patterns where they mark a real boundary. The names explain
the code; they are not a reason to add another interface or class.

| Pattern | Use here | Why it earns its place |
|---|---|---|
| Ports and adapters | `AuthService` and `ChatRepository`, with Firebase and in-memory adapters | The app talks to external Firebase services and tests need deterministic replacements. |
| Strategy | `LLMStrategy` with `ProxyStreamStrategy` | The mediator can run against the private Worker or a controlled test stream. |
| Mediator | `ChatMediator` | It coordinates account, thread, persistence, generation, retries, and stale-operation checks. |
| Observer | `ObservableThreadStore` + `useSyncExternalStore` | React's built-in subscription hook consumes the store's snapshots; no custom event bus is needed. |
| Provider / Context | `AuthProvider` and `useAuth` | Authentication is shared by the navbar and chat without threading props through the whole app. |

The UI uses browser and React features directly: a native `<select>` for saved
chats, `<pre>` text nodes to preserve line breaks without interpreting HTML,
`window.confirm` before discarding unsaved work, `fetch` streams, `AbortController`,
and `crypto.randomUUID()`. The app has no authored CSS.

`ChatMediator` is one app-level instance because there is one chat page. Its
constructor accepts the store and generation strategy to make behavior tests
deterministic. No second mediator interface is needed. The Firebase service and
repository contracts remain because those are the external boundaries that have
multiple implementations.

The saved-chat selector reads metadata only. Selecting one chat loads its
messages. Guest messages stay in memory and are imported as a separate thread on
sign-in; Firestore uses a transaction and message-ID conflict checks so retries
cannot replace existing history.

Known v1 limits: guest messages disappear on reload; the shared Worker URL and
Gemini Free-tier quota must be configured before public chat works; no
cross-tab coordination or admin usage dashboard exists. Keep the independent
`meta/` curriculum as a learning inventory; it is not the product feature list.
