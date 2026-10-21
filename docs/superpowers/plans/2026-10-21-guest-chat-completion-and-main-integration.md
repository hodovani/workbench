# Guest Chat Completion and Main Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish and verify the guest-first chat v1, then integrate the reviewed result into `main` while preserving the work already staged, unstaged, and untracked there.

**Architecture:** Keep the static Next.js app, the local/Cloudflare Worker proxy, Firebase Auth, and Firestore. Retain the mediator/store and only the auth, storage, and generation boundaries that isolate real external systems; use native browser APIs and semantic HTML for user-facing behavior.

**Tech Stack:** TypeScript, Next.js 16, React, Firebase Auth/Firestore, Cloudflare Workers, Vitest/Testing Library, Firebase emulators, Biome, pnpm.

**Spec:** [Guest-first design](../specs/2026-10-21-guest-chat-design.md). This plan covers the remaining completion and integration work; the earlier [layered TDD plan](2026-10-21-guest-chat-tdd.md) remains the detailed scenario catalogue.

## Execution record — 2026-10-21

- The implementation is integrated in `main`: feature commit `813f081`, merge
  commit `54c9674`, and local endpoint config commit `55e26c9`.
- The main checkout's original staged/unstaged/untracked state was saved as
  `stash@{0}` (`codex pre-integration main snapshot 2026-10-21`). Its unrelated
  `opencode.jsonc` change remains unstaged. Overlapping implementation and
  docs were superseded by the verified feature; the old BYOK adapter tests and
  stylesheet remain recoverable in the stash, not active in the merged tree.
- Final local gates: lint, typecheck, 88 fast tests, 9 type-contract tests,
  7 Worker tests, Knip, coverage thresholds, Worker dry-run, and static build
  passed. Coverage: 93.61% statements/lines, 83.97% branches, 94.66% functions.
- The local Worker CORS preflight returned 204 and one guest prompt streamed
  successfully. Production-origin dry-run shows only
  `https://hodovani.github.io`; a synthetic key sentinel and `GEMINI_API_KEY`
  were absent from static assets. No authored CSS or `meta/` changes were made.
- Firestore emulator execution is pending because Java is unavailable; the
  fresh integration command stopped before running tests. Sign-in/history
  was not manually tested against a real account. Browser E01–E06 remain
  deferred; the unload behavior is unit-tested, not manually triggered.
- A fresh dependency reinstall could not complete because the package registry
  was unreachable. Main's ignored `node_modules` was rebuilt from the already
  installed, lockfile-matched worktree dependencies so its final checks could
  run. Keep the worktree until main has its own successful networked install.

## Current evidence and open work

- The feature worktree and `/Users/matviihodovaniuk/Documents/workbench` are both at `6dd19db`; the feature worktree has extensive uncommitted implementation, while `main` has its own staged, unstaged, and untracked work.
- The local `main` branch is one README commit behind `origin/main` (`c614f4a`). That commit changes `README.md`, and the feature worktree also has an uncommitted README edit; reconcile those inputs before integrating.
- `pnpm dev` was started from the feature worktree; Next.js reported `https://localhost:3000` and Wrangler reported local secrets from ignored `worker/.dev.vars`. The user confirmed the page appears to work. Local CORS preflight for the HTTPS origin returned 204.
- The source already has focused tests for guest generation, account switching, import idempotency, Firestore ownership, the Worker protocol, and the history selector. The earlier plan and `agent-progress.md` disagree about which scenarios are complete and report different suite counts. Re-run evidence before changing status claims.
- The design explicitly requires an unsaved-guest unload warning, but no `beforeunload` implementation or test is currently present. Full automated browser E2E is intentionally deferred; use a short manual acceptance checklist for cross-layer journeys.

## Global constraints

- Start each behavior change with a failing assertion; do not rewrite passing behavior just to manufacture a red test.
- Preserve `meta/` unchanged as the user's manually curated curriculum.
- Keep application-authored CSS at zero; use browser-native controls, semantic HTML, and normal document flow.
- Keep the Gemini key in `worker/.dev.vars` locally and in a Cloudflare Worker secret in production. Never print, stage, or commit either value.
- Local development may allow only the local app origins; production `worker/wrangler.toml` must retain the GitHub Pages origin only.
- Do not deploy, create a paid service, change Firebase production data, or rewrite the user's main-branch work as part of verification.
- Read the installed Next.js guide before changing framework APIs; read the Gemini API skill before changing Gemini integration.
- Do not run the auto-restaging pre-commit hook while preserving the current partial staging state.

## Review focus

- A guest can lose an unsaved transcript by navigating away; test that only a nonempty guest transcript triggers the browser's `beforeunload` warning.
- A delayed load, write, import, or stream from one auth session could leak into another; retain the existing controlled-promise mediator tests and run them.
- A malformed or cross-owner Firestore record could bypass intended boundaries; run repository and security-rule tests against the emulator, not an admin-only fake.
- A public Worker request could expose a secret or accept client-controlled model/provider settings; run Worker boundary tests and inspect production origin configuration.
- Conflicting local source edits or the newer remote README could be lost during integration; verify the pre-integration snapshot and compare each overlap before resolving it.

---

### Task 1: Reconcile the evidence before coding

**Files:**
- Read: `docs/superpowers/specs/2026-10-21-guest-chat-design.md`
- Read/update: `docs/superpowers/plans/2026-10-21-guest-chat-tdd.md`
- Read/update: `agent-progress.md`, `feature_list.json`, `TESTING.md`

**Interfaces:**
- Consumes: existing scenario IDs in the design and prior plan.
- Produces: one accurate pass/pending/deferred ledger; do not change product code in this task.

- [ ] **Step 1: Capture both Git states separately.** Record `git status --porcelain=v2 --branch` in the main checkout and feature worktree, including staged, unstaged, and untracked paths. Record the `main..origin/main` commit and its README diff. Do not inspect secret values.
- [ ] **Step 2: Verify secret files are ignored and untracked.** Assert `worker/.dev.vars` and `.env.local` are not returned by `git ls-files`; inspect only ignore/status metadata, never contents.
- [ ] **Step 3: Run the existing focused suites without editing tests.** Run `pnpm test`, `pnpm test:worker`, `pnpm test:types`, and `pnpm test:integration` from the feature worktree; record exact counts and failures in `agent-progress.md`.
- [ ] **Step 4: Reconcile scenario IDs.** Match R01–R12, P01–P09, G01–G06, L01–L05, I01–I06, H01–H07, D01–D09, and U01–U05 to named assertions in the actual tests. Mark a scenario complete only when its assertion exists and its owning suite passes. Keep browser E01–E06 explicitly deferred.
- [ ] **Step 5: Update only stale status documentation.** Correct the earlier plan, `agent-progress.md`, `feature_list.json`, and `TESTING.md` to agree with observed test results. Keep planned admin usage monitoring planned and preserve `meta/` untouched.

### Task 2: Protect guest transcripts on navigation

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `useChatSnapshot()` provides `userId` and `messages`.
- Produces: Home prevents navigation only when `userId` is absent and the guest has at least one message.

- [ ] **Step 1: Write the failing tests.** In `page.test.tsx`, mock the existing child components and snapshot hook. Assert `beforeunload` is prevented for a nonempty guest transcript, and is not prevented for an empty guest transcript or a signed-in conversation.
- [ ] **Step 2: Run `pnpm exec vitest run src/app/page.test.tsx`.** Expected: the nonempty-guest assertion fails because Home currently has no unload handler.
- [ ] **Step 3: Add the smallest native `beforeunload` effect to Home.** Set the browser-supported cancellation signal only for the nonempty guest case; do not add custom modal UI or persist guest messages.
- [ ] **Step 4: Re-run the focused test and `pnpm lint`.** Expected: all three unload cases pass and the existing chat reminder remains unchanged.

### Task 3: Verify the local combined dev command and secret boundary

**Files:**
- Read: `package.json`, `scripts/dev.mjs`, `.env.development`, `.gitignore`, `worker/wrangler.toml`, `worker/README.md`
- Test: local startup and CORS smoke check; add an automated test only if a focused reliability gap remains after inspection.

**Interfaces:**
- Consumes: `pnpm dev` starts Next.js and Wrangler; `pnpm worker:dev` remains an optional Worker-only command.
- Produces: local UI endpoint `https://localhost:3000`, local Worker endpoint `http://localhost:8787`, local-only origin override, production allowlist unchanged.

- [ ] **Step 1: Assert configuration values without reading credentials.** Confirm `.env.development` points to port 8787, `.gitignore` excludes `worker/.dev.vars`, local `worker:dev` allows the app's local origins, and production `worker/wrangler.toml` contains only the published Pages origin.
- [ ] **Step 2: Run `pnpm dev` and verify both ready messages.** Confirm the Next.js HTTPS server and Wrangler appear in the same command; send Ctrl+C and confirm both processes exit.
- [ ] **Step 3: Send a local OPTIONS preflight** from `https://localhost:3000` to `http://localhost:8787/`; expect HTTP 204 and matching `Access-Control-Allow-Origin`. Do not make a Gemini request for this check.
- [ ] **Step 4: Run `pnpm worker:check` and inspect its effective production origin.** Expected: only the GitHub Pages origin is in the production config; local CORS overrides are supplied only by `worker:dev`.

### Task 4: Run one cross-layer browser acceptance pass

**Files:**
- Read: `README.md`, `worker/README.md`, `TESTING.md`
- Test: existing local app in the browser; no new E2E framework in this pass.

**Interfaces:**
- Consumes: running local app, local Worker, and the user's already-configured local development key.
- Produces: a recorded manual result for browser wiring, not a claim of automated E2E coverage.

- [ ] **Step 1: Confirm a fresh guest sees chat input without a key modal or sign-in requirement.**
- [ ] **Step 2: Send one short prompt and confirm streamed output appears.** Use the local Worker and one request only; never expose the key in browser storage or built assets.
- [ ] **Step 3: Confirm the guest reminder and unload warning appear only when there is guest history.**
- [ ] **Step 4: If validating auth/history, use a test account or emulator and confirm an existing saved conversation and imported guest chat remain separate and independently selectable.** Do not modify a production account's history without the user operating the browser.
- [ ] **Step 5: Record exactly which journeys were exercised and any manual-only limitation in `agent-progress.md` and `TESTING.md`.

### Task 5: Review architecture and remove only proven redundancy

**Files:**
- Review: `src/ARCHITECTURE_REVIEW.md`, `src/auth/`, `src/storage/`, `src/ai-chat/`, `src/lib/`
- Modify only files with a demonstrated redundant abstraction or misleading claim.

**Interfaces:**
- Consumes: passing behavior tests from Tasks 1–4.
- Produces: no new architecture layer; retain ports only at Firebase Auth, Firestore, and generation boundaries.

- [ ] **Step 1: Trace callers for each interface/adapter.** For every proposed deletion, list its production callers and the boundary it protects. Keep an abstraction when it isolates an external system or enables meaningful contract testing.
- [ ] **Step 2: Check native platform replacements.** Prefer `fetch`, `AbortController`, browser events, React Context, and `useSyncExternalStore` where they already satisfy the behavior; do not wrap them in duplicate classes.
- [ ] **Step 3: Make no cleanup edit without a test or static assertion that protects the behavior.** If the code is already the smallest clear design, record “no change needed.” Do not alter `meta/` or add a CSS workaround.
- [ ] **Step 4: Re-run the affected focused tests and `pnpm lint`.** Expected: cleanup changes no public behavior or saved data shape.

### Task 6: Complete the clean verification gate

**Files:**
- Read/update: `TESTING.md`, `agent-progress.md`, `feature_list.json`
- Verify: all application, Worker, Firestore, and build artifacts.

**Interfaces:**
- Consumes: Tasks 1–5 complete.
- Produces: reproducible verification evidence and an explicit list of external launch checks.

- [ ] **Step 1: Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:types`, `pnpm test:worker`, `pnpm test:integration`, `pnpm knip`, and `pnpm build`.** Record exact results; do not count a started command as a pass.
- [ ] **Step 2: Run `pnpm worker:check`.** Confirm it is a dry run and verify the effective origin remains production-only.
- [ ] **Step 3: Inspect tracked/generated frontend output for `GEMINI_API_KEY` and a synthetic sentinel value.** Never print or read out the actual local secret while checking that it is absent from static assets.
- [ ] **Step 4: Update docs with passed scenario IDs, browser-only checks, and remaining launch conditions.** Keep real production deployment, quota verification, and data-use review outside this task.

### Task 7: Reconcile the worktree with `main` without losing existing edits

**Files:**
- Git state only; resolve source files after a three-way comparison.
- Expected overlaps include `README.md`, `package.json`, `pnpm-lock.yaml`, `src/ai-chat/*`, `src/app/*`, `.github/workflows/deploy.yml`, and `.githooks/pre-commit`.

**Interfaces:**
- Consumes: verified feature worktree; main's staged/unstaged/untracked snapshot; `origin/main` commit `c614f4a`.
- Produces: the verified guest-chat work and the pre-existing main changes both present, with original staging distinctions restored where Git permits.

- [x] **Step 1: Review the full main snapshot and classify each change as keep, superseded, or conflict.** Include staged changes, unstaged changes, and untracked files. Do not treat a file's staged version as equivalent to its working-tree version.
- [x] **Step 2: Commit the reviewed feature work on `codex/guest-chat-tdd` only after the verification gate passes.** Use a focused commit; do not stage ignored credentials, `meta/`, or unrelated files.
- [x] **Step 3: Preserve main's local state in a named Git stash including untracked files and index state.** Verify the stash summary contains expected user files and no secrets before changing `main`; retain it as a recovery point.
- [x] **Step 4: Fast-forward `main` to the already-known `origin/main` README commit, then merge the reviewed feature branch.** Resolve the README using the remote documentation and guest-chat setup as separate inputs.
- [x] **Step 5: Reconcile the named main snapshot, restoring original staging distinctions where possible.** Resolve conflicts by retaining valid user changes and the tested guest-chat behavior; keep the stash as a recovery point.
- [x] **Step 6: Run the full verification gate from `main` and compare its final status with the recorded pre-integration snapshot.** Confirm `meta/`, ignored local credentials, and the user's unrelated files remain untouched.
- [x] **Step 7: Present the final diff and preserved staging status for review.** Do not deploy or push as part of local integration.

## Completion criteria

- All non-deferred v1 behavior scenarios have passing assertions or are explicitly documented with a reason for deferral.
- The nonempty-guest unload warning is covered by a regression test.
- `pnpm dev` runs app and Worker together; production origin remains restricted to GitHub Pages; no Gemini secret reaches tracked files or frontend assets.
- No application-authored CSS is introduced and `meta/` is unchanged.
- The final verified behavior is present in `main` together with all preserved main-branch work, and final Git status is compared against the recorded snapshot.
- No deployment or paid service activation occurs in this plan.
