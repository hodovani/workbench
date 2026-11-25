import type {
  BrowserMetric,
  Latency,
  MetricsSummary,
} from "../src/metrics/types";

type Value = string | number | null;

interface Database {
  prepare(sql: string): {
    bind(...values: Value[]): {
      run(): Promise<unknown>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
}

export interface MetricsEnv {
  METRICS_DB?: Database;
  METRICS_LIMIT?: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
}

export interface Background {
  waitUntil(promise: Promise<unknown>): void;
}

export type WorkerOutcome =
  | "completed"
  | "empty"
  | "quota"
  | "upstream_error"
  | "incomplete"
  | "disconnected"
  | "unavailable";

const DAY = 86_400_000;
const MAX_TIMING_MS = 600_000;
const isoDay = (at: number) => new Date(at).toISOString().slice(0, 10);

function insert(
  db: Database,
  id: string,
  kind: string,
  outcome: string,
  ms: number | null,
  duration: number | null,
) {
  return db
    .prepare(
      "INSERT INTO metrics VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
    )
    .bind(id, Date.now(), kind, outcome, ms, duration)
    .run();
}

export function recordGeneration(
  env: MetricsEnv,
  ctx: Background | undefined,
  outcome: WorkerOutcome,
  first: number | null,
  duration: number | null,
) {
  const db = env.METRICS_DB;
  if (!db || !ctx) return;
  ctx.waitUntil(
    Promise.resolve()
      .then(() =>
        insert(db, crypto.randomUUID(), "worker", outcome, first, duration),
      )
      .catch(() => console.error("Generation metrics write failed")),
  );
}

function validReport(value: unknown): value is BrowserMetric & { id: string } {
  if (!value || typeof value !== "object" || Object.keys(value).length !== 4)
    return false;
  const { id, kind, outcome, ms } = value as Record<string, unknown>;
  if (
    typeof id !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      id,
    )
  )
    return false;
  const validTime =
    typeof ms === "number" &&
    Number.isInteger(ms) &&
    ms >= 0 &&
    ms <= MAX_TIMING_MS;
  if (kind === "send") {
    if (outcome === "completed") return validTime;
    if (outcome === "save_failed") return ms === null;
    return (
      (outcome === "reply_failed" || outcome === "interrupted") &&
      (ms === null || validTime)
    );
  }
  return (
    (kind === "save_initial" ||
      kind === "save_final" ||
      kind === "retry_initial" ||
      kind === "retry_final") &&
    (outcome === "ok" || outcome === "failed") &&
    validTime
  );
}

export async function ingestMetrics(
  request: Request,
  env: MetricsEnv,
  readJson: () => Promise<unknown>,
) {
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: { allow: "POST" } });
  if (!request.headers.has("origin"))
    return new Response(null, { status: 403 });
  if (!env.METRICS_DB || !env.METRICS_LIMIT)
    return new Response(null, { status: 503 });
  const { success } = await env.METRICS_LIMIT.limit({
    key: request.headers.get("CF-Connecting-IP") ?? "local",
  });
  if (!success) return new Response(null, { status: 429 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    return new Response(null, { status: 415 });

  let value: unknown;
  try {
    value = await readJson();
  } catch (error) {
    return new Response(null, {
      status: error instanceof RangeError ? 413 : 400,
    });
  }
  if (!validReport(value)) return new Response(null, { status: 400 });
  await insert(
    env.METRICS_DB,
    value.id,
    value.kind,
    value.outcome,
    value.ms,
    null,
  );
  return new Response(null, { status: 204 });
}

async function summarize(db: Database): Promise<MetricsSummary> {
  const now = Date.now();
  const end = now - (now % DAY);
  const start = end - 28 * DAY;
  const [coverage, outcomes, latencyRows] = await Promise.all([
    db
      .prepare("SELECT at FROM metrics_start WHERE id = 1")
      .bind()
      .all<{ at: number }>(),
    db
      .prepare(`
      SELECT at / ${DAY} * ${DAY} AS day, kind, outcome, count(*) AS n
      FROM metrics WHERE at >= ? AND at < ? GROUP BY day, kind, outcome ORDER BY day
    `)
      .bind(start, end)
      .all<{
        day: number;
        kind: keyof MetricsSummary["counts"];
        outcome: string;
        n: number;
      }>(),
    db
      .prepare(`
      WITH recent AS (SELECT kind, outcome, ms, duration FROM metrics WHERE at >= ? AND at < ?),
      samples AS (
        SELECT CASE kind WHEN 'send' THEN 'browser_first' WHEN 'worker' THEN 'worker_first' ELSE kind END AS metric, ms AS value
        FROM recent WHERE ms IS NOT NULL
        UNION ALL
        SELECT 'worker_complete', duration FROM recent WHERE kind = 'worker' AND outcome = 'completed' AND duration IS NOT NULL
      ),
      ranked AS (
        SELECT metric, value, row_number() OVER (PARTITION BY metric ORDER BY value) AS rank,
          count(*) OVER (PARTITION BY metric) AS n FROM samples
      )
      SELECT metric, max(n) AS n,
        avg(CASE WHEN rank IN ((n + 1) / 2, (n + 2) / 2) THEN value END) AS p50,
        max(CASE WHEN n >= 20 AND rank = (95 * n + 99) / 100 THEN value END) AS p95
      FROM ranked GROUP BY metric
    `)
      .bind(start, end)
      .all<Latency & { metric: keyof MetricsSummary["latency"] }>(),
  ]);
  const first = coverage.results[0]?.at;
  const daily: MetricsSummary["daily"] = [];
  const counts: MetricsSummary["counts"] = {};
  const repliesByDay = new Map<number, number>();
  for (const { day, kind, outcome, n } of outcomes.results) {
    counts[kind] ??= {};
    const breakdown = counts[kind];
    breakdown[outcome] = (breakdown[outcome] ?? 0) + n;
    if (kind === "worker" && outcome === "completed") repliesByDay.set(day, n);
  }
  if (first !== undefined) {
    for (
      let day = Math.max(start, first - (first % DAY));
      day < end;
      day += DAY
    )
      daily.push({ day: isoDay(day), replies: repliesByDay.get(day) ?? 0 });
  }
  return {
    from: isoDay(start),
    through: isoDay(end - DAY),
    startedAt: first === undefined ? null : isoDay(first),
    refreshedAt: new Date(now).toISOString(),
    daily,
    counts,
    latency: Object.fromEntries(
      latencyRows.results.map(({ metric, ...values }) => [metric, values]),
    ),
  };
}

export async function serveSummary(
  request: Request,
  env: MetricsEnv,
  ctx: Background | undefined,
) {
  if (request.method !== "GET")
    return new Response(null, { status: 405, headers: { allow: "GET" } });
  if (!env.METRICS_DB) return new Response(null, { status: 503 });
  const cache = (globalThis as { caches?: { default?: Cache } }).caches
    ?.default;
  const key = new Request(new URL("/metrics/summary", request.url));
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) return hit;
  const response = Response.json(await summarize(env.METRICS_DB), {
    headers: { "cache-control": "public, max-age=300" },
  });
  if (cache && ctx)
    ctx.waitUntil(cache.put(key, response.clone()).catch(() => {}));
  return response;
}

export async function pruneMetrics(env: MetricsEnv) {
  await env.METRICS_DB?.prepare("DELETE FROM metrics WHERE at < ?")
    .bind(Date.now() - 35 * DAY)
    .run();
}
