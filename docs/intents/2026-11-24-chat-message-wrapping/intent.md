# Keep AI chat messages inside the conversation

Status: implemented

## Problem

Long user and assistant messages extend past the chat container and create horizontal page overflow. This makes the conversation look broken, especially on narrow screens.

## Desired outcome

Ordinary prose and long unbroken text, including pasted URLs, wrap within the existing chat width. Messages retain their original text, line breaks, indentation, and monospace styling.

## Scope and constraints

Apply the wrapping rule to both roles through the shared message renderer and preserve the surrounding layout. The agreed approach uses scoped CSS and adds zero application JavaScript. Browser verification uses synthetic messages and a mocked reply with external requests blocked.

## How we'll know

- Run `pnpm test:e2e` to send a prompt with a long URL and render a mocked assistant reply containing prose, a manual newline, indentation, and a long unbroken token.
- At 320 px and 1280 px, verify that both message bodies preserve their exact text, occupy multiple visual lines, and fit within the conversation. Verify that the page has no horizontal overflow.
- Confirm the regression fails against the original renderer and passes with the scoped wrapping rule.

## Open questions

None. Full wrapping of unbroken text took priority over the initial HTML-only preference.

## Delivery

- [Before screenshot](before.png) from pre-fix commit `b885034`.
- [After screenshot](after.png) from implementation commit `1b86743`.
- [Pull request #5](https://github.com/hodovani/workbench/pull/5).

Both screenshots were captured during PR follow-up in Chromium at 320 × 900 on `/`, at the top of the page in a signed-out guest session after the same mocked reply finished. The screenshots use the prompt and reply from the [browser regression](../../../e2e/chat-wrapping.spec.mts).
