# Move algorithm practice out of Workbench

Status: implemented

## Problem

Workbench is a portfolio for interactive engineering projects, currently led by AI Chat. Its 31 standalone algorithm and data-structure exercises serve a separate practice goal and have no Workbench application callers.

## Desired outcome

The exercises, their documentation, and all their test cases live in the public [Algorithms and Data Structures repository](https://github.com/hodovani/algorithms-and-data-structures). Workbench’s README introduces AI Chat and the portfolio it belongs to.

## Scope and constraints

Migrate the `src/utils` snapshot from Workbench `origin/main` at `a70e3df017dee5d69517dece53b5a66ded870619`. Preserve solution behavior, JSDoc, and test cases. Use Node 24 with `node:test`, a strict TypeScript configuration derived from Workbench, and the copied Biome configuration. Pin TypeScript 7.0.2 as the sole direct package dependency and validate the copied config with standalone Biome 2.6.9. Leave the original Matrix Zeroing intent untouched. The Workbench change is limited to the source removal and repository documentation.

## How we'll know

- The original Vitest suite and migrated Node suite run the same cases across all 31 exercises.
- The destination passes strict type checking and GitHub Actions runs `pnpm typecheck` and `pnpm test` on pushes and pull requests.
- The destination’s first workflow passes before the Workbench copies are removed. Workbench passes its commit hooks, including coverage and a production build, followed by its hosted PR checks.

## Open questions

None.

## Delivery

- [Destination snapshot](https://github.com/hodovani/algorithms-and-data-structures/commit/a876c01443c89dedf32fcbe3b8e3351fccc97cf2)
- [Passing destination workflow](https://github.com/hodovani/algorithms-and-data-structures/actions/runs/45429395131)
- Both test runners passed the same 215 cases across 31 files. The destination passed strict TypeScript and Biome checks.
