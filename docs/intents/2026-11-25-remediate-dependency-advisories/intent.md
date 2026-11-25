# Remediate dependency security findings

Status: in progress

## Problem

The Security check on PR #18 reports high and critical dependency advisories.

## Desired outcome

Update affected dependencies and produce a lockfile with zero high or critical OSV findings. Submit a draft PR targeting `ci/pr-security-health`.

## Scope and constraints

Use supported upgrades and narrow overrides as required. Preserve application behavior and existing CI thresholds. Do not edit the parent PR branch.

## How we'll know

- The checksum-verified OSV-Scanner reports zero high or critical findings.
- Frozen install, lint, typecheck, Knip, tests, worker checks, emulator tests, and build pass.
- The stacked PR targets `ci/pr-security-health` and its hosted dependency check passes.

## Open questions

None.

## Delivery

Add stacked PR and hosted verification results.

## Current findings

- Updating direct dependencies to latest changed 15 direct package versions across majors, including Firebase 13, Vitest 5, TypeScript 7, and Biome 2.6.
- OSV still reports high findings in transitive `@grpc/grpc-js@1.9.16` and `uuid@9.0.1`. Other lower-severity findings remain.
- Biome 2.6 rejects the existing `noInlineStyles` rule in `biome.json`. The current updates are therefore unverified for compatibility and do not meet the intent's security acceptance criteria.
