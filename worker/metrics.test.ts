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

it("counts Today's events from UTC midnight to the snapshot time", async () => {
  const { app, env, sqlite } = fixture();
  const midnight = Date.parse("2026-11-25T00:00:00Z");
  const now = midnight + 60_000;
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  const request = () =>
    app.fetch(
      new Request("https://worker.test/metrics/summary?period=today"),
      env,
    );

  try {
    const empty = await request();
    expect(empty.headers.get("cache-control")).toBe("public, max-age=15");
    expect(await empty.json()).toMatchObject({
      from: "2026-11-25",
      through: "2026-11-25",
      refreshedAt: "2026-11-25T00:01:00.000Z",
      counts: {},
      latency: {},
    });

    const insert = sqlite.prepare(
      "INSERT INTO metrics VALUES (?, ?, ?, ?, ?, ?)",
    );
    insert.run("yesterday", midnight - 1, "worker", "completed", 40, 80);
    insert.run("at-midnight", midnight, "worker", "completed", 100, 200);
    insert.run("browser", now - 1, "send", "completed", 150, null);
    insert.run("at-snapshot", now, "worker", "completed", 500, 600);
    expect(await (await request()).json()).toMatchObject({
      daily: [{ day: "2026-11-25", replies: 1 }],
      counts: { worker: { completed: 1 }, send: { completed: 1 } },
      latency: {
        worker_complete: { n: 1, p50: 200, p95: null },
        browser_first: { n: 1, p50: 150, p95: null },
      },
    });
  } finally {
    clock.mockRestore();
  }
});

it("keeps the history and each UTC day's Today cache separate", async () => {
  const { app, env } = fixture();
  const clock = vi
    .spyOn(Date, "now")
    .mockReturnValue(Date.parse("2026-11-25T23:59:58Z"));
  const entries = new Map<string, Response>();
  vi.stubGlobal("caches", {
    default: {
      async match(key: Request) {
        return entries.get(key.url)?.clone();
      },
      async put(key: Request, response: Response) {
        entries.set(key.url, response);
      },
    },
  });
  const request = (query = "") =>
    app.fetch(new Request(`https://worker.test/metrics/summary${query}`), env, {
      waitUntil: () => {},
    });

  try {
    expect((await (await request()).json()).through).toBe("2026-11-24");
    const response = await request("?period=today");
    expect(response.headers.get("cache-control")).toBe("public, max-age=2");
    const today = await response.json();
    expect(today.through).toBe("2026-11-25");
    clock.mockReturnValue(Date.parse("2026-11-25T23:59:58.500Z"));
    expect((await (await request("?period=today")).json()).refreshedAt).toBe(
      today.refreshedAt,
    );
    clock.mockReturnValue(Date.parse("2026-11-26T00:00:01Z"));
    expect((await (await request("?period=today")).json()).through).toBe(
      "2026-11-26",
    );
    expect(entries.size).toBe(3);
  } finally {
    vi.unstubAllGlobals();
    clock.mockRestore();
  }
});
