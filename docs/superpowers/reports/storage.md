# Storage slice report

## Changed files

- `src/storage/types.ts`: added the repository import and atomic exchange operations.
- `src/storage/MockChatRepository.ts`: added idempotent guest imports, conflict-safe exchange updates, and deterministic list ties.
- `src/storage/FirestoreChatRepository.ts`: added SHA-256 import fingerprints, bounded payload validation, transaction-based imports/exchanges, deterministic metadata ordering, and malformed-message errors. Removed obsolete single-thread write/delete methods after tracing callers.
- `src/storage/MockChatRepository.test.ts`: added import idempotency/conflict and exchange update/history coverage.
- `src/storage/FirestoreChatRepository.integration.test.ts`: added real emulator coverage for import/exchange durability, ordering, malformed data, atomic conflict handling, and ownership rules.
- `firestore.rules`: enforce authenticated UID ownership and deny all other paths.

## Verification

- `pnpm exec vitest run src/storage/MockChatRepository.test.ts src/storage/FirestoreChatRepository.test.ts`: **16 passed**.
- `pnpm test:integration` with Java 21: **9 passed** against the Firestore Emulator using a demo project, including existing-history preservation and atomic rejection when one transaction write violates rules.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm knip`: **passed** in the integrated worktree.

## Red/green record and outstanding work

The first emulator runs found fixture issues (shared emulator data and an absent legacy thread document); these were corrected before the final run. New tests also caught rules accepting an unexpected credential field; the rules now reject it. Emulator tests use the demo project and require Java 21.

## Follow-up cleanup and additive import retry

Removed `saveThread`, `saveMessage`, and `deleteThread` from `ChatRepository` and both adapters after confirming no production callers remain. Removed their dependent tests while keeping `listThreads`, `getThread`, guest import, and exchange-save coverage. Added mock and emulator regressions showing an extended guest transcript appends new messages, preserves existing records, and rejects changed content at an existing message ID. `guestImportFingerprint` remains the immutable fingerprint of the original import; a marked thread can only be extended after shared messages and metadata match.

- New additive-import regressions were observed red before the implementation: the adapters rejected the changed transcript fingerprint.
- Focused storage unit tests: **11 passed**. Emulator integration tests: **9 passed**.
- Contract type tests pass **9/9**. Biome and full project typecheck pass after integrated changes.
- `vitest.config.mts` excludes the emulator-backed Firestore adapter from the fast-suite coverage denominator; `pnpm test:integration` exercises it against the real SDK and rules emulator.
