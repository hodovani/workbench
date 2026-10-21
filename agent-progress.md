# Guest-first chat progress

Implementation and behavior tests live in the isolated branch/worktree. The
original checkout and its staged state were left unchanged.

## Completed slices

- Guest-first mediator, session isolation, signed-in save-before-generation,
  retryable persistence, interrupted-stream recovery, and separate guest import.
- Firebase Auth error feedback and safe detach behavior. An auth startup
  regression confirms that resolving as signed out does not erase a guest chat.
- Firestore metadata/message repository, transactional exchange writes,
  append-only idempotent guest import, schema/ownership rules, and emulator tests.
- Private Cloudflare Worker generation endpoint and browser stream adapter.
- Native saved-chat selector and semantic chat form; no authored CSS or browser
  API key storage.
- Removed the unused single-thread/BYOK UI and repository methods after tracing
  their callers.

## Verification state (refreshed 2026-10-21)

The fast suite passes **88 tests across 15 files**. Worker protocol tests pass
**7/7**, type-contract tests pass **9/9**, and coverage is **93.61% statements
and lines, 83.97% branches, 94.66% functions**, above the configured
90/80/90/90 thresholds. Lint, typecheck, Knip, production build, and the Worker
dry-run pass. The static output was scanned with a synthetic Gemini-key sentinel;
neither the sentinel nor `GEMINI_API_KEY` appears in the generated assets.

The Firestore integration suite is **pending a Java runtime** in this current
environment. The fresh `pnpm test:integration` attempt stopped before running
tests because Java is unavailable; an earlier progress note recorded 9/9
emulator tests, but that historical result is not a fresh verification of this
checkout. No Java installation or system change was made.

The local combined dev command starts Next.js and Wrangler; CORS preflight from
the local HTTPS app returned 204. One guest prompt completed through the local
Worker. The manual pass did not exercise sign-in or saved-history import, and
the native browser unload dialog was covered by unit tests rather than manually
triggered. Production deployment, quotas, and real account history remain
outside this local check.

The Playwright browser acceptance layer remains deferred. These tests cover the
mediator, UI controls, Firebase rules/repository, and Worker protocol at their
boundaries, but do not prove the fully deployed browser journey.

Run all reproducible checks listed in [TESTING.md](TESTING.md). Production
Firebase/Worker settings, Free-tier availability, and the hosted integration
remain launch checks. The `meta/` curriculum is preserved as a separate learning
inventory and has not been filtered or rewritten.
