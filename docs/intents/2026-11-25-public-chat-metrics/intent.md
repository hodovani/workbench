# Publish AI chat usage and experience metrics

Status: implemented. Cloudflare rollout pending.

## Problem

Portfolio visitors can try Workbench's chat but cannot see its use, reliability, or wait times. Worker HTTP status alone misses failures during streaming and before the browser sends a request.

## Desired outcome

A public, read-only Metrics page shows generated reply volume, observed initial send outcomes, time to first text and reply completion, Worker failures, and signed-in save health. Each measure explains its source and denominator.

## Scope and constraints

Keep GitHub Pages static. Use the existing Worker and a private D1 store for content-free operational telemetry. Publish daily aggregates and a 28-completed-UTC-day summary. Browser reporting is best effort. Retain events for 35 days. Keep chat streaming, Firestore rules, and the ability to use the chat as a guest intact. Use the standard public read model pattern: the Worker exposes a fixed aggregate representation of private measurements.

## How we'll know

Check complete, empty, interrupted, quota-limited and incomplete streams, initial and final save failures, retry accounting, and telemetry outages. Verify the public route and navigation, aggregate denominators and UTC boundaries, insufficient-data and unavailable states, and static export at the Pages base path. Confirm deployment and fresh measurements when authorized Cloudflare access is available.

## Delivery

- [Before](before.png) — chat route /workbench, 1280 × 900, signed out, empty chat.
- [After](after.png) — same chat route, viewport, and state.
- [Metrics dashboard](dashboard.png) — /workbench/metrics at the same viewport, populated with synthetic measurements from local D1.
- [Worker rollout instructions](../../../worker/README.md#chat-metrics)
- [Follow-up issue #14](https://github.com/hodovani/workbench/issues/14) — signed-in history can reorder prompts and replies with tied timestamps.

Playwright covered the public route at 320 px, unavailable summaries, guest send reporting, and the unsaved-chat guard across navigation. The Firestore emulator exercised signed-in save acknowledgements with a deterministic reply. Local Wrangler confirmed ingestion, a populated summary, and expiry of an event older than 35 days. Production verification requires an active Cloudflare session.
