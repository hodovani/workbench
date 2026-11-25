# Show Workbench security results on every PR

Status: in progress

## Problem

The PR report shows lint, type checks, and coverage. Reviewers cannot see the proposed merge commit's security findings or tell whether its Firestore rules and Worker tests ran.

## Desired outcome

Every PR run reports static findings for JavaScript and TypeScript, GitHub Actions workflows, and the full dependency lockfile. Existing Firestore and Worker test outcomes appear beside those scans. A high or critical finding fails the security check even when it predates the PR. Failed or incomplete scans remain visible.

## Scope and constraints

Use GitHub CodeQL, Google OSV-Scanner, and the existing tests. Use a read-only PR job with pinned tools and no new secrets, repository bot, or upload of scanner output. Keep GitHub Secret Scanning and push protection enabled as repository-wide controls. Use the current comment and Actions summary. This change has no UI impact. Live Firebase and Cloudflare settings are outside CI coverage.

## How we'll know

- The baseline is the existing [PR report](../2026-11-24-pr-ci-report/intent.md), which has no security checks. Its three report tests passed before implementation.
- Test no findings, lower and unscored findings, both blocking thresholds, scanner errors, and unavailable output with synthetic SARIF. Check that coverage stays visible when security fails.
- Verify on a draft PR that security and build use the same merge commit, the combined report appears even when security fails, and reruns update one bot comment.

## Open questions

None blocking implementation.

## Delivery

- GitHub's repository API confirmed Secret Scanning and push protection are enabled. The PR and hosted verification evidence will be recorded during delivery.
- The checksum-verified OSV scan of the baseline read 944 packages and reported 9 high, 2 critical, and 19 lower-severity findings. The dependency lockfile is outside this reporting change.
