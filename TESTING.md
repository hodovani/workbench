# Behavior and verification

Tests are derived from the guest-first product behavior, not carried forward
just because an older test exists.

| Layer | Important behavior | Test location |
|---|---|---|
| Chat mediator | Guests generate without storage; signed-in prompts save before generation; retries reuse IDs; imports preserve history; late account work cannot leak | `src/ai-chat/ChatMediator*.test.ts` |
| Thread state | Reloaded pending responses become interrupted | `src/ai-chat/ThreadStore.test.ts` |
| Storage | Exchange updates are idempotent; imported threads accept later messages and reject ID conflicts | `src/storage/MockChatRepository.test.ts`, `FirestoreChatRepository.integration.test.ts` |
| Security rules | Owner-only access; malformed roles and credential fields are denied | `FirestoreChatRepository.integration.test.ts` |
| Private generation | Request validation, fixed model/config, secret confinement, quota/network errors, cancellation | `worker/index.test.ts`, `src/ai-chat/ProxyStreamStrategy.test.ts` |
| UI | Native chat selector, guest access, busy/draft behavior, retry, inert text, auth failure and discard confirmation | Component tests under `src/` |

Run the standard local gates:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:types
pnpm test:worker
pnpm test:integration
pnpm knip
pnpm build
pnpm worker:check
```

`pnpm test` is the fast suite. `pnpm test:integration` starts a local Firestore
emulator with the demo project ID and requires Java. It never calls a production
Firebase project. `pnpm test:worker` uses mocked upstream streams; no live Gemini
key is needed. `pnpm worker:check` only performs a Wrangler dry run.

The GitHub Pages build is static. Set repository variables
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, and
`NEXT_PUBLIC_CHAT_API_URL` before deploying. Set `GEMINI_API_KEY` as a Worker
secret and the site origin in `ALLOWED_ORIGIN`; the Worker secret is never a
`NEXT_PUBLIC_*` value. Production values are not present in this repository.

There is no full browser E2E harness in v1. The chat state machine, UI controls,
real Firestore rules/repository, and Worker wire protocol are tested at their
respective boundaries. A deployed cross-layer smoke test remains a launch check.
