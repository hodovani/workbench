# Run the chat browser regression in CI

Status: implemented

## Problem

PR #5 adds a browser test for chat message overflow, but the GitHub Actions workflow skips that test. The testing guide also omits the Chromium installation step, so a fresh checkout cannot run the browser test by following the guide.

## Desired outcome

The GitHub build runs the existing chat browser test, and contributors can run it locally with the documented setup commands.

## Scope and constraints

Install headless Chromium and run `pnpm test:e2e` in the existing build workflow. Keep the Playwright server at `/` when GitHub Actions sets `GITHUB_ACTIONS=true`, while leaving the GitHub Pages build under `/workbench`. The test keeps its mocked reply and blocks external requests. This follow-up changes CI and documentation only.

## How we'll know

- Under `GITHUB_ACTIONS=true`, `pnpm test:e2e` passes at both viewport widths.
- `TESTING.md` tells developers how to install headless Chromium and run the test.
- A manually dispatched workflow on the stacked branch passes the new browser step. Automatic PR checks currently target `main`.

## Open questions

None.

## Delivery

- The pre-change run with `GITHUB_ACTIONS=true` timed out waiting for the root URL. Both browser cases passed after overriding the Pages flag for the Playwright server.
- [Originating PR #5](https://github.com/hodovani/workbench/pull/5).
- [Tracking issue #7](https://github.com/hodovani/workbench/issues/7).
- Base branch for the follow-up is `fix/chat-message-wrapping`.
