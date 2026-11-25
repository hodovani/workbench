import { expect, test } from "@playwright/test";

test("opens public metrics from chat and explains the measured samples", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/metrics/summary", (route) =>
    route.fulfill({
      json: {
        from: "2026-10-28",
        through: "2026-11-24",
        startedAt: "2026-11-22",
        refreshedAt: "2026-11-25T12:00:00Z",
        daily: [
          { day: "2026-11-22", replies: 8 },
          { day: "2026-11-23", replies: 4 },
        ],
        counts: {
          worker: { completed: 12, quota: 2 },
          send: { completed: 7, save_failed: 1 },
        },
        latency: { browser_first: { n: 7, p50: 320, p95: null } },
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Metrics" })).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole("link", { name: "Metrics" }).click();
  await expect(
    page.getByRole("heading", { name: "AI Chat Metrics" }),
  ).toBeVisible();
  await expect(page.getByText("7 of 8 reported initial sends")).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Browser.*320 ms.*Insufficient data.*7/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Provider quota.*2/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("distinguishes an unavailable summary from zero activity", async ({
  page,
}) => {
  await page.route("**/metrics/summary", (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.goto("/metrics");
  await expect(
    page.getByText("Metrics unavailable", { exact: true }),
  ).toBeVisible({ timeout: 5000 });
});

test("guest replies post a content-free initial send report", async ({
  page,
}) => {
  await page.route("**/__test/chat", (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body: '{"type":"delta","text":"Example answer"}\n{"type":"done"}\n',
    }),
  );
  await page.route("**/metrics/events", (route) =>
    route.fulfill({ status: 204 }),
  );
  const report = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/metrics/events",
  );

  await page.goto("/");
  await page.getByLabel("Your message:").fill("Example prompt");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Example answer")).toBeVisible();
  expect((await report).postDataJSON()).toEqual({
    kind: "send",
    outcome: "completed",
    id: expect.any(String),
    ms: expect.any(Number),
  });
});

test("keeps the guest conversation and unload warning while viewing metrics", async ({
  page,
}) => {
  await page.route("**/__test/chat", (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body: '{"type":"delta","text":"Unsaved answer"}\n{"type":"done"}\n',
    }),
  );
  await page.route("**/metrics/events", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/");
  await page.getByLabel("Your message:").fill("Keep this chat");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Unsaved answer")).toBeVisible();
  await page.getByRole("link", { name: "Metrics" }).click();
  await expect(
    page.getByRole("heading", { name: "AI Chat Metrics" }),
  ).toBeVisible();

  expect(
    await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(true);
  await page.getByRole("link", { name: "Chat", exact: true }).click();
  await expect(page.getByText("Unsaved answer")).toBeVisible();
});
