<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

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
