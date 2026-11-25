# Add measurement prompts to the intent template

Status: implemented

## Problem

Workbench contributors are asked how to verify an outcome, but the template does not prompt them to explain which evidence matters or how they will collect and share it.

## Desired outcome

Contributors can record what to measure, why it matters, how to collect the data, and how to present it to the intended audience.

## Scope and constraints

Add four prompts immediately after the existing verification question in the intent template. Keep the rest of the template intact. This is a Markdown-only change.

## How we'll know

At baseline, the section contains one verification question and no measurement prompts. Compare the updated section with the agreed wording and confirm that all four prompts follow the existing question in order. Review the diff to confirm that only the template and this intent changed, then run `git diff --check`. Report the results in the draft PR.

## Open questions

None blocking implementation.

## Delivery

- [Intent template](../_template.md)
- Verified the four prompts against the agreed wording and placement. `git diff --check` passed.
