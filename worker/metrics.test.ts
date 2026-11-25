import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";
import { createWorker } from "./index";

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("./migrations/0001_metrics.sql", import.meta.url),
      "utf8",
    ),
  );
  const app = createWorker(vi.fn());
  const env = {
    ALLOWED_ORIGIN: "https://site.test",
    METRICS_LIMIT: {
      async limit() {
        return { success: true };
      },
    },
    METRICS_DB: {
      prepare(sql: string) {
        const statement = sqlite.prepare(sql);
        return {
          bind(...values: (string | number | null)[]) {
            return {
              async run() {
                return statement.run(...values);
              },
              async all() {
                return { results: statement.all(...values) };
              },
            };
          },
        };
      },
    },
  };
  return { app, env, sqlite };
}

it("accepts a content-free browser outcome exactly once and rejects extra fields", async () => {
  const { app, env, sqlite } = fixture();
  const send = (body: unknown) =>
    app.fetch(
      new Request("https://worker.test/metrics/events", {
        method: "POST",
        headers: {
          origin: "https://site.test",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }),
      env,
    );
  const report = {
    id: crypto.randomUUID(),
    kind: "send",
    outcome: "completed",
    ms: 31,
  };
  expect((await send(report)).status).toBe(204);
  expect((await send(report)).status).toBe(204);
  expect((await send({ ...report, prompt: "private" })).status).toBe(400);
  expect(sqlite.prepare("SELECT count(*) AS n FROM metrics").get()).toEqual({
    n: 1,
  });
});

it("publishes only complete UTC days, an explicit denominator and sparse latency", async () => {
  const { app, env, sqlite } = fixture();
  const now = Date.parse("2026-11-25T12:00:00Z");
  vi.spyOn(Date, "now").mockReturnValue(now);
  try {
    const insert = sqlite.prepare(
      "INSERT INTO metrics VALUES (?, ?, ?, ?, ?, ?)",
    );
    insert.run(
      "first",
      Date.parse("2026-11-24T23:59:59Z"),
      "worker",
      "completed",
      100,
      200,
    );
    insert.run(
      "today",
      Date.parse("2026-11-25T00:00:00Z"),
      "worker",
      "completed",
      100,
      200,
    );
    insert.run(
      "send-1",
      Date.parse("2026-11-24T00:00:00Z"),
      "send",
      "completed",
      150,
      null,
    );
    insert.run(
      "send-2",
      Date.parse("2026-11-24T00:01:00Z"),
      "send",
      "save_failed",
      null,
      null,
    );
    const response = await app.fetch(
      new Request("https://worker.test/metrics/summary"),
      env,
    );
    expect(response.status).toBe(200);
    const summary = await response.json();
    expect(summary).toMatchObject({
      from: "2026-10-28",
      through: "2026-11-24",
      daily: [{ day: "2026-11-24", replies: 1 }],
      counts: {
        worker: { completed: 1 },
        send: { completed: 1, save_failed: 1 },
      },
      latency: { browser_first: { n: 1, p50: 150, p95: null } },
    });
    expect(JSON.stringify(summary)).not.toContain("send-1");
  } finally {
    vi.restoreAllMocks();
  }
});

it("computes the median and p95 across the full window, including only full replies in completion latency", async () => {
  const { app, env, sqlite } = fixture();
  const at = Date.parse("2026-11-24T12:00:00Z");
  const clock = vi.spyOn(Date, "now").mockReturnValue(at + 86_400_000);
  try {
    const insert = sqlite.prepare(
      "INSERT INTO metrics VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (let i = 1; i <= 20; i++) {
      insert.run(String(i), at, "worker", "completed", i, i * 10);
    }
    insert.run("partial", at, "worker", "incomplete", 21, null);
    const response = await app.fetch(
      new Request("https://worker.test/metrics/summary"),
      env,
    );
    expect((await response.json()).latency).toEqual({
      worker_first: { n: 21, p50: 11, p95: 20 },
      worker_complete: { n: 20, p50: 105, p95: 190 },
    });
  } finally {
    clock.mockRestore();
  }
});
