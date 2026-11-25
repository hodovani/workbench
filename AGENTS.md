<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Workbench — AI Agent Guide

## 1. Project Overview

Workbench is a full-stack TypeScript/Next.js 16 workspace for deliberate engineering practice.

## 2. Tech Stack

- **Framework:** Next.js 16.3.6 (static export, React Compiler)
- **UI:** React 19
- **Backend:** Firebase (Auth + Firestore)
- **AI:** Google Gen AI (Gemini)
- **Lint/Format:** Biome
- **Package Manager:** pnpm

## 3. Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm lint` | Biome lint check |
| `pnpm format` | Biome format |

## 4. Architecture Patterns

Always use a well-known pattern (GoF, Refactoring.Guru, standard web patterns) for any
non-trivial structure. Name it. Don't invent custom architecture.

## 5. Code Style

Biome configuration:
- 2-space indent
- Organize imports: on
- All recommended rule groups enabled: `a11y`, `correctness`, `complexity`, `performance`, `security`, `style`, `suspicious`
- Domains: `next`, `react`

## 6. Pre-commit Hook

Runs `biome check --write --staged` then `pnpm build`; both must pass.

## 7. Environment

- Firebase config via `NEXT_PUBLIC_*` env vars
- Gemini API key stored client-side in localStorage (user-provided)

## 8. Deployment

GitHub Actions: lint -> build -> deploy static export to GitHub Pages.

## 9. Conventions

- Dependency injection via constructor params
- Contract interfaces in `types.ts`
- `"use client"` on client components
- HMR-safe singletons

## 10. Tests

- Cover meaningful edge cases from the stated constraints, including input-size and value boundaries where relevant.
- Keep test inputs within the stated constraints.

## 11. Intent and planning gate

Begin every repository change in Plan mode. Find or draft
`docs/intents/YYYY-MM-DD-short-slug/intent.md` using
[the intent template](docs/intents/_template.md). The directory name is the
intent ID. Record the problem, desired outcome, scope and constraints, and how
to verify success. Resolve any open questions that block implementation.

**Hard stop:** Do not start implementation until the filled `intent.md` exists
on disk and the plan is complete. If the intent is missing or incomplete, limit
work to read-only discovery and capturing the intent and its baseline evidence.
If the client cannot enter Plan mode, stay in read-only planning and report
the limitation. Leave Plan mode before editing implementation files.

For UI changes, capture the **before** screenshot or recording when initializing
the intent, before editing the UI. Link it from the intent and record the route,
viewport, and relevant UI state so the comparison can be reproduced.

## 12. Automatic PR handoff

Opening the PR is part of finishing implementation. Once the intent's acceptance
criteria are met and required local checks pass, commit only this task's changes
on a feature branch using the normal commit hooks. Push and open a draft PR
against `main` with `gh pr create --draft --base main`. Start this automatically
without a separate prompt. Preserve unrelated edits and staged changes. Update
the existing PR if the branch already has one. Leave merging to the user.

Include the intent link, what changed, and verification results in the PR
description. Every UI PR must also include accessible **before** and **after**
artifacts for the same route, viewport, and relevant state. Capture the after
artifact from the implementation. For a new surface, show the previous user
flow or entry point as the baseline.

## 13. PR monitoring and follow-ups

Immediately after opening or updating the PR, start monitoring its checks in
the background, for example with `gh pr checks <PR_URL> --watch`. Keep the task
active, read the result, and check the PR's review status before handing it off.
Watch again after each fix. Return the PR URL and latest status when the checks
pass and actionable findings are resolved, the PR closes, or a concrete blocker
prevents progress. Report pending checks if monitoring is interrupted.

- Inspect failed job logs and review findings. Fix verified regressions within
  the intent on the same PR, run the relevant checks, and push the fix. Retry a
  clearly transient failure once. Report access or infrastructure blockers.
- For verified issues outside the intent, including separate copy or test
  fixes, open or reuse a GitHub issue. Record the evidence, the intended fix,
  and how to verify it. Link the issue and the originating PR to each other.
  Keep the fix in its own PR with its own `intent.md`. Stack it on the current
  branch only if it depends on that branch. If the issue blocks the current PR,
  record the dependency and keep the current PR draft.
