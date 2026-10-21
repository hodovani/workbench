# T05–T06 proxy slice

Implemented the native-fetch Cloudflare Worker and the browser NDJSON adapter.
The Worker accepts only `{ messages: [{ role, content }] }`, enforces the 64 KiB
and 100-message limits, fixes the Gemini model/system instruction/1,024-token
cap, keeps the key in `GEMINI_API_KEY`, and maps quota and upstream failures to
safe codes. It parses Gemini Interactions SSE incrementally, returns delta/done
or error events, applies the configured origin allowlist, and cancels upstream
work when the caller disconnects. No runtime dependency or deployment was
added. Local configuration guidance is in `worker/README.md`.

`ProxyStreamStrategy` sends only role and content, forwards an optional abort
signal, handles transport-split NDJSON records, ignores empty deltas, preserves
safe proxy error codes (including quota errors on non-success responses), and
rejects premature EOF.

## TDD and verification

- RED: the first adapter test run failed because `ProxyStreamStrategy` did not
  exist yet. After implementation, the new strategy tests passed.
- RED: an added test for a 503 NDJSON quota event exposed that the adapter
  discarded the proxy's safe event and reported only the HTTP status. The
  adapter now parses the event body before applying a generic status fallback.
- Worker tests were written before the handler. Initial focused runs found a
  test import mistake and a fixture missing Gemini's `event_type` field; after
  correcting those, the Worker contract tests pass.
- `pnpm exec vitest run --configLoader native --config worker/vitest.config.mts`:
  7 tests pass.
- `pnpm exec vitest run --configLoader native src/ai-chat/ProxyStreamStrategy.test.ts`:
  4 tests pass.
- `pnpm test:worker`: **7 passed**; browser adapter tests pass **4/4**.
- `pnpm lint`, `pnpm typecheck`, and `pnpm worker:check` pass in the integrated
  worktree. Wrangler dry-run bundles the Worker without deploying it.

All upstream calls in tests are mocked. The Gemini project's current free-tier
availability, deployed Worker configuration, and live browser streaming remain
unverified; deployment/provisioning is outside this slice.
