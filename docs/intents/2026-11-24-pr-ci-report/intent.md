# Show CI results on Workbench pull requests

Status: accepted

## Problem

Reviewers have to open individual GitHub Actions steps to see which checks ran and what coverage they produced. Stacked pull requests currently miss automatic runs because the workflow filters by base branch.

## Desired outcome

Each pull request run reports lint, typecheck, unit tests with coverage, and type contract results together. Same-repository PRs have one bot comment that updates on reruns. Fork and Dependabot PRs can read the report in the Actions run.

## Scope and constraints

Reuse the existing checks, coverage thresholds, and deployment rules. Keep write permissions in the comment job, which does not check out PR code. A report must not mask a failed check. This change has no UI impact.

## How we'll know

- Passed, failed, and skipped results are reported accurately, including runs with no coverage output.
- When available, the report includes statement, branch, function, and line coverage, plus the run link.
- A live draft PR gets one comment that updates on rerun. A controlled failing run publishes its report and stays red.

## Open questions

None blocking implementation.

## Delivery

See the implementation PR and its Actions runs for verification.
