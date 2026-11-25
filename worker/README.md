# Gemini chat proxy Worker

This Worker keeps the Gemini API key server-side and accepts only role/content
history at `POST /`. It is configured for the Workbench static frontend through
`NEXT_PUBLIC_CHAT_API_URL` and `ALLOWED_ORIGIN`.

For local testing, put a separate development key in `worker/.dev.vars`:

```dotenv
GEMINI_API_KEY=your-local-development-key
```

Then run `pnpm dev`. It starts Next.js and Wrangler together; Ctrl+C stops both.
Wrangler serves the local Worker at `http://localhost:8787`; `.env.development`
points the app there. The local Worker allows the local Next.js origins without
changing the production origin in `wrangler.toml`. If `.env.local` sets
`NEXT_PUBLIC_CHAT_API_URL`, set it to `http://localhost:8787` as well because it
overrides `.env.development`. `worker/.dev.vars` is ignored by Git.

To run only the Worker, use `pnpm worker:dev`.

An origin allowlist enables browser CORS; it is not authentication or abuse
prevention. The local key is not uploaded to Cloudflare.

The Worker fixes the model, system instruction and 1,024-token output limit.
It accepts at most 100 messages and 64 KiB per request, and never logs prompts
or returns upstream error text. Public callers can use the configured Gemini
project's available quota; no paid fallback is attempted.

## Production setup

Cloudflare makes its Workers Free plan available by default. Its documented
limit is 100,000 requests per day and 10 ms CPU time per request; network wait
time is excluded. See [current Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

From the repository root, after confirming the site origin in `wrangler.toml`:

```sh
pnpm worker:check
pnpm exec wrangler deploy --config worker/wrangler.toml
pnpm exec wrangler secret put GEMINI_API_KEY --config worker/wrangler.toml
```

Deploy prints the Worker URL. `secret put` prompts for the Gemini key, so the
value stays out of source control; Cloudflare stores secrets encrypted and does
not show their values afterward. See [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
Set the Worker URL as the GitHub repository variable
`NEXT_PUBLIC_CHAT_API_URL`. The static build also needs the Firebase web app
values listed in the root README. Enable Google sign-in in Firebase
Authentication, add the Pages hostname to its authorized domains, and deploy
`firestore.rules` to that Firebase project. Firebase web config is public
client configuration; the Gemini Developer API key must remain a Worker secret.

## Chat metrics

The static Metrics page uses the proxy origin's read-only `GET /metrics/summary`.
The Worker stores terminal generation outcomes and validated reports from
`POST /metrics/events` in the private `workbench-chat-metrics` D1 database.
Reports use fresh event IDs, bounded timings, and fixed status codes. They carry
no chat text or account identifiers. Browser reports are best effort and the
origin check and rate limit provide only basic abuse control. Direct callers
can contribute Worker traffic. Aggregates cover 28 complete UTC days, with
daily totals starting on the date of the first report. The first day may be
partial. The summary cache lasts five minutes and a daily cron prunes recordings
older than 35 days.

Initialize the local database before running `pnpm dev`:

```sh
pnpm exec wrangler d1 migrations apply workbench-chat-metrics --config worker/wrangler.toml --local
```

For the first production release, create the database in the same Cloudflare
account as the existing Worker, apply the migration and deploy the Worker
before merging the Pages change:

```sh
pnpm exec wrangler d1 create workbench-chat-metrics
pnpm exec wrangler d1 migrations apply workbench-chat-metrics --config worker/wrangler.toml --remote
pnpm exec wrangler deploy --config worker/wrangler.toml
```

Run the create command only when the named database is absent. Use the existing
Gemini secret and Pages Worker URL. Verify the summary on the deployed Worker
and use a separate local or staging dataset when exercising guest and signed-in
sends. Verify the live Metrics route after Pages deployment. The dashboard
leaves today's activity out until the next UTC day.
