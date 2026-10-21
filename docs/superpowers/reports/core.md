# Guest chat core: T01 and T07–T12

Implemented the Mediator pattern with repository and generation ports. The mediator owns account/thread lifecycle and signed-in durability; `ThreadStore` publishes snapshots through React's built-in `useSyncExternalStore` subscription API. Redundant mediator/store interfaces were removed.

## Red evidence

- Before the session guard, `pnpm vitest run --configLoader runner src/ai-chat/ChatMediator.lifecycle.test.ts` failed because a same-account load from an earlier detach/attach replaced the current transcript (`stale session` appeared instead of `current session`).
- Before guest-first generation, the focused lifecycle test showed that a guest send produced no generation call or messages because the old mediator required a browser key.
- Before save-before-generation, the lifecycle test observed no repository save or model call for an authenticated prompt.
- Before hydration recovery, `pnpm vitest run --configLoader runner src/ai-chat/ThreadStore.test.ts` failed because a persisted `streaming` response stayed `streaming` instead of becoming `interrupted`.
- Before guarding late write failures, the controlled account-A write test failed because `A storage failed` appeared in account B's snapshot after switching accounts.
- Before release recovery, the controlled initial-save test showed that cleanup during the pending write let the old operation continue instead of exposing `recovery: "save"`.

## Green evidence

`pnpm test` passes: 14 files, 81 tests. `pnpm typecheck` and `pnpm lint` pass. The focused mediator/store set is included in that suite.

Covered guest generation, single-flight sending, pending-save ordering, initial and final save retry, stable IDs, interrupted guest import, retryable import failure, account-switch isolation for loads/imports/writes, Strict Mode release, saved-thread loading/switching/new drafts, retry from stored messages, and pending-response recovery.

## Remaining

- Guest history is intentionally in-memory and does not survive reload until imported.
- Repository requests cannot be physically canceled. The mediator gates late results by operation and account identity; a same-account load/import may finish after `release()` so remounts do not duplicate it.
- These tests use deterministic in-memory repositories and streams. Firestore transaction/fingerprint guarantees and Worker protocol behavior are verified by separate emulator and Worker suites.
- Full browser acceptance and live deployment remain unverified; see `agent-progress.md` for the handoff boundary.
