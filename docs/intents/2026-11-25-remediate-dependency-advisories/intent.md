# Remediate dependency security findings

Status: in progress

## Problem

The Security check on PR #18 reports high and critical dependency advisories.

## Desired outcome

Update affected dependencies, restore a passing build, and surface remaining OSV findings as warnings by default. Submit a draft PR targeting `ci/pr-security-health`.

## Scope and constraints

Use supported upgrades and narrow overrides as required. Preserve application behavior, coverage thresholds, and the CodeQL gate. Allow repositories to opt back into the OSV gate. Do not edit the parent PR branch.

## How we'll know

- The full OSV scan reports known findings. High and critical findings warn by default and fail when the repository variable OSV_BLOCKING is set to true.
- Frozen install, lint, typecheck, Knip, tests, worker checks, emulator tests, and build pass.
- The stacked PR targets `ci/pr-security-health` and its hosted PR report shows dependency warnings alongside a passing build.

## Open questions

None.

## Delivery

Stack the draft PR on [PR #18](https://github.com/hodovani/workbench/pull/18). Track the remaining dependency advisories in [issue #19](https://github.com/hodovani/workbench/issues/19).

## Current findings

- Updating direct dependencies to latest changed 15 direct package versions across majors, including Firebase 13, Vitest 5, TypeScript 7, and Biome 2.6.
- OSV still reports high findings in transitive `@grpc/grpc-js@1.9.16` and `uuid@9.0.1`. Other lower-severity findings remain.
- Biome 2.6 moved `noInlineStyles` from nursery to style. The migrated configuration preserves the recommended presets and keeps the rule enabled. CI uses Node 24 for the updated Firebase packages. Recovery tests cover loading a saved conversation and retrying a reply after a save failure under Vitest 5.
