# Guest-first portfolio chat: layered TDD implementation plan

**Goal:** Immediate guest chat, optional Google sign-in, and durable separate conversations without a visitor API key.

**Architecture:** Static Next.js frontend; a minimal Worker owns the Gemini key. Existing auth/storage adapters and chat mediator remain, with session-safe asynchronous operations and React subscriptions.

**Stack:** TypeScript, Next.js, React, Firebase, Gemini, Vitest/Testing Library; Worker and Firestore emulator tooling are in scope. Playwright browser acceptance is deferred.

**Spec:** [Guest-first design](../specs/2026-10-21-guest-chat-design.md). This plan replaces the earlier mandatory-login, BYOK, single-conversation plan.

## Global constraints and execution rules

- Preserve staging boundaries, existing source history, and `meta/`. Do not run the existing auto-restaging pre-commit hook during partial work.
- Zero application-authored CSS, including inline styles, frameworks, resets, and JavaScript layout substitutes. Use semantic HTML, native form controls, and normal document flow.
- Cloudflare Workers Free is proposed, not provisioned. Account creation and deployment are separate launch steps; no paid plan is part of v1.
- Read installed Next.js guidance before touching framework code; read the Gemini skill before changing SDK integration.
- No real AI calls in automated tests; no deployments or commits as an incidental step.
- Design assertions from the spec. Audit existing tests individually; retain meaningful checks, replace weak mock-only checks, remove checks for intentionally removed behavior.
- For each behavioral case: write test, observe an assertion fail for the intended reason, implement minimally, run focused tests, refactor while green, run the fast suite. Infrastructure errors are not a behavioral red.
- Existing correct behavior may pass characterization tests immediately. Record that honestly; do not delete working implementation to manufacture a red.
- Record scenario IDs, red evidence, green commands, and remaining limits in the progress log. Coverage alone does not establish completion.
- Parallel slices were delegated after the user's explicit authorization; final integration and verification ran in this worktree.

## Layer 1 — Test foundation and external contracts

### T01: Record baseline and build deterministic fixtures

- [ ] Record Git index/worktree/untracked state and run existing non-mutating checks.
- [x] Create test-only controlled streams, deferred repository operations, and two account fixtures. Use literal expected records, not production helpers to calculate expected results.
- [x] Add the first lifecycle regression: start loading A, switch to B, release A last; assert that only B's messages are visible.
- [x] Keep real mediator/store logic in this test. Mock only external boundaries. Confirm failure identifies stale state rather than fixture setup.

### T02: Define repository behavior before changing adapters

Keep `listThreads(userId)` and `getThread(userId, threadId)`. Add `importGuestThread(userId, thread): Promise<void>` and `saveExchange(userId, threadId, prompt, response): Promise<void>`, using existing domain types. Remove old methods only after consumers migrate.

- [x] R01: save an exchange, load it, compare literal IDs/roles/content/statuses.
- [x] R02: update the response with the same IDs; assert two records, not four.
- [x] R03: save a second exchange; assert earlier messages and creation time survive.
- [x] R04: import guest G into an account containing H; assert G and H both exist unchanged and are separately loadable.
- [ ] R05: import G twice, including after an acknowledgement failure; assert exactly one G.
- [x] R06: retry G import after G acquired later messages; assert those later messages survive.
- [x] R07: conflicting content at the same IDs rejects without altering either record set.
- [x] R08: legacy `current` remains listed and loadable.
- [ ] Implement the smallest in-memory contract support. Keep test helpers out of production exports.

### T03: Verify Firestore with real emulators

- [ ] Run R01–R08 against the real SDK and local emulator, using isolated test projects/data.
- [x] R09: insert history out of order and assert chronological loading; list threads by descending update time with deterministic ID tie-breaking.
- [ ] R12: list two thread metadata records without reading their message subcollections; selecting one loads only that thread's messages. Verify the repository query boundary and real results, not a pre-sorted fake.
- [x] R10: deny one write in a real transaction and assert no partial documents remain.
- [x] R11: malformed stored messages produce a recoverable load error, not fabricated valid messages.
- [ ] Implement transactions and boundary decoding; preserve existing valid document paths and data.

### T04: Prove ownership and validation rules

- [x] S01: unauthenticated reads/writes are denied.
- [x] S02: A cannot read/write B's thread or message documents.
- [x] S03: A can perform intended owner operations.
- [x] S04: invalid roles/statuses and unexpected credential fields are denied; remaining malformed shapes are rejected by repository validation.
- [ ] Fix rules only after observing relevant failures. Run through SDK clients, not an admin client that bypasses rules.

## Layer 2 — Shared free generation endpoint

### T05: Build the smallest private-key proxy

Create `worker/` as the independent backend boundary; keep the frontend static.

- [x] P01: a valid POST with literal history produces ordered delta events and one completion event from a controlled upstream stream.
- [x] P02: the upstream receives the server secret; browser events and errors never contain it.
- [x] P03: absent secret fails clearly without making an upstream request.
- [x] P04: invalid method/body/role, client model/URL/key fields, over-64-KiB body, or over-100-message history are rejected before upstream work.
- [x] P05: model/system instruction/output limit are server-owned; user content cannot override request configuration.
- [ ] Implement the Worker and a normalized newline-delimited JSON event protocol: `{type:"delta",text}`, `{type:"done"}`, `{type:"error",code}`.

### T06: Handle limits, interruption, and browser consumption

- [x] P06: upstream quota failure becomes a quota-unavailable response/event; no fallback provider or paid retry is invoked.
- [x] P07: network failure before/after streaming produces a recoverable service error; no raw upstream error body leaks.
- [x] P08: browser disconnect cancels upstream work where supported.
- [x] P09: browser stream parser handles events split across transport chunks, empty deltas, terminal errors, and premature EOF.
- [ ] Implement a client generation adapter against the Worker protocol. Replace browser Gemini calls and remove the required key-entry flow.

## Layer 3 — Guest behavior and safe state transitions

### T07: Guest can chat immediately

- [ ] G01: render signed out, submit a prompt, see streaming output without login/key entry.
- [ ] G02: guest generation makes no Firestore reads/writes.
- [ ] G03: blank input does nothing; a second send during generation creates no exchange.
- [ ] G04: busy state visibly locks/unlocks the real input without manually rerendering it.
- [ ] G05: generation failure retains the prompt and offers retry; quota failure has specific feedback.
- [ ] G06: a fresh page has no previous guest messages; a nonempty guest session shows the sign-in reminder.
- [ ] Implement readiness and busy state as a stable subscribed snapshot; update responses by ID.

### T08: Session and stream isolation

- [ ] L01: A→B with A's load resolving last leaves B unchanged.
- [ ] L02: A→detach→A with an old load resolving last cannot replace the new session.
- [ ] L03: A's old chunks/errors/save completions cannot affect B or the signed-out view.
- [ ] L04: Strict Mode effect cleanup/remount does not duplicate saves or generation.
- [ ] L05: repeated identity notification for the same mounted account does not reload over active work.
- [ ] Introduce operation/session identity and cleanup; abort obsolete generation and ignore late results independently of abort success.

## Layer 4 — Guest import and minimal history navigation

### T09: Sign in without losing guest history

- [ ] I01: nonempty guest chat signs into an account with history; preserve both, select the imported guest chat.
- [ ] I02: empty guest signs in; select most recently updated saved chat, or an empty draft.
- [ ] I03: import fails; transcript stays visible, marked unsaved, with retry. No generation/switching until recovery.
- [ ] I04: import retry and duplicate auth events create no duplicate thread or messages.
- [ ] I05: sign-in during streaming interrupts the response, imports its prompt and received content, and ignores late chunks.
- [ ] I06: A's pending import completes after logout or switch to B; no A transcript appears in B and no B write occurs.
- [ ] Implement import coordination using the existing guest UUID and captured destination account. Do not merge conversations.

### T10: Reopen both conversations

- [ ] H01: history list contains old and imported conversations in updated order; selecting either loads its own messages.
- [ ] H02: New chat creates an empty draft; no stored thread until the first accepted prompt.
- [ ] H03: first prompt supplies the title without a model request for naming.
- [ ] H04: generation/save/import blocks switching and New chat; a failed load offers retry.
- [ ] H05: logout clears the list/transcript and shows an empty guest chat.
- [ ] H06: use the labeled native Saved chats select to switch between two saved conversations by keyboard; the selected value and displayed messages agree.
- [ ] H07: an acknowledged save/import updates and reorders one existing metadata entry; retry creates no duplicate option. Guests have no saved-chat selector.
- [ ] Render a native `<label>`/`<select>`/`<option>` control and New chat button above the transcript in normal document flow, exactly as described in the spec. Use an empty-value New chat option for drafts. No sidebar, custom dropdown, CSS, rename/delete/search/pagination UI, extra list document, or localStorage cache.

## Layer 5 — Signed-in durability and recovery

### T11: Persist before generation

- [ ] D01: signed-in prompt plus pending response commit before the first generation request.
- [ ] D02: initial save fails; generation is never called; transcript remains recoverable.
- [ ] D03: retry initial save uses identical IDs and then starts generation once.
- [ ] D04: normal completion updates the same response and preserves earlier history.
- [ ] Implement the ordered save→generate→save flow; keep guest generation independent of Firestore.

### T12: Recover without duplicate generation

- [ ] D05: final save fails; response remains visible and marked unsaved; new sends are blocked.
- [ ] D06: Retry saving commits the result without another generation request.
- [ ] D07: reload a pending response; show interrupted state with its original prompt.
- [ ] D08: retry latest failed/interrupted response keeps IDs and excludes error text from model history.
- [ ] D09: older failed responses cannot accidentally regenerate the latest prompt.
- [ ] Remove `lastUserPrompt` dependence; track persistence phase and identify the exchange being retried.

### T13: User-facing auth and exit errors

- [ ] U01: login cancellation/failure keeps guest transcript and restores usable controls.
- [ ] U02: failed logout leaves the account active and reports failure.
- [ ] U03: logout with unsaved work offers cancel/discard; cancel preserves work, discard clears it.
- [ ] U04: rejected submission does not silently erase the draft.
- [ ] U05: labels, Enter/Shift+Enter, error/retry focus, history selection, and disabled controls work by keyboard.
- [ ] Implement only the state/error UI required by these cases; do not add an admin dashboard.

## Layer 6 — Full composition and cleanup

### T14: Browser acceptance journeys — deferred

Playwright was removed because the browser acceptance layer is not implemented in this pass. Component, mediator, emulator, and Worker protocol suites cover their respective boundaries. The deployed end-to-end journeys remain follow-up work; do not treat lower-level tests as proof of the complete browser flow.

- [ ] E01–E06: full browser journeys listed above remain unverified.

### T15: Simplify only after behavior is protected

- [x] Remove obsolete BYOK components, browser key storage, direct browser SDK calls, and their obsolete tests/dependencies.
- [x] Remove unused repository methods only after checking all consumers. Keep list/load/import/exchange operations because the product now needs them.
- [x] Remove duplicated internal interfaces; retain actual auth/storage/generation ports.
- [x] Keep mediator/store and React's existing context/subscription mechanisms. Add no new event bus, service framework, or DI container.
- [x] Add a rendering regression for literal HTML-looking content and preserve plain text/line breaks without interpreting user text as markup; remove the global stylesheet without recreating styling in JavaScript.
- [x] Update feature docs with pattern purpose, real limitations, and test links. Keep curriculum intact and distinguish it from committed product scope.

### T16: Reproducible checks and handoff

- [x] Run lint, typecheck, fast tests, meaningful type-contract tests, Knip, and coverage.
- [x] Add separate Firestore emulator and Worker protocol test scripts/CI checks. Browser test script is deferred with T14.
- [x] Verify production static export with the GitHub Pages base path and placeholder public Firebase/Worker configuration; diagnose the missing-config build failure.
- [x] Verify Worker tests/build and confirm generated frontend assets contain no Gemini secret.
- [ ] Validate the complete proposed snapshot from a clean checkout, including lockfile and formerly untracked configuration/tests.
- [x] Report passed scenario IDs and unresolved launch checks. Do not change the existing index or deploy as part of verification.

## Verification commands and completion

Focused red/green: `pnpm exec vitest run <file> -t '<case>'`. Full fast gate: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:types`, `pnpm knip`, `pnpm coverage`. Introduce `pnpm test:integration`, `pnpm test:e2e`, and `pnpm test:worker` with lifecycle-managed local servers/emulators. Final frontend gate: `pnpm build` plus a static-export browser smoke test.

For a representative test in each layer, name the real regression it catches: missing owner check, missing session guard, generation before persistence, duplicate import, leaked key, or nonreactive busy state. Fix weak assertions rather than adding coverage-only tests.

Completion requires guest usability, non-destructive idempotent import, independently reopenable conversations, signed-in prompt durability, session isolation, secret confinement, and recoverable quota errors. Production free-tier capacity, domain configuration, applicable data-use terms, and live deployment remain separate launch checks. Free allowance exhaustion and lack of cross-tab coordination are accepted v1 limits.
