# Check today's AI Chat activity

Status: implemented. Production Pages verification pending.

## Problem

A signed-out visitor can receive a guest reply and still see no activity on the public dashboard because the report ends at the previous UTC day.

## Desired outcome

Select Today (UTC) to see the current partial UTC day's totals and refresh them after a test send. Keep the 28 completed days as the default.

## Scope and constraints

Reuse the Worker public read model and D1 data. Keep the existing historical summary and its cache. Today uses its own cache for up to 15 seconds, ending at UTC midnight. The static dashboard exposes aggregate data and uses the same metric definitions for both periods.

## How we'll know

Compare the reported initial sends before and after a signed-out send, and check that only Today changes during the current UTC day. Exercise the UTC boundary and cache separation in Worker tests and the period selector and refresh in browser tests. Verify the deployed flow after the Worker and Pages releases.

## Open questions

None for implementation.

## Delivery

- [Before](before.png) — local Pages base path /workbench/metrics, 1280 × 900, signed out, 28-day view with synthetic metrics.
- [After](after.png) — the same route, viewport, and 28-day view with the period selector.
- [Today](today.png) — the same route and viewport with Today selected and one synthetic reported send.
