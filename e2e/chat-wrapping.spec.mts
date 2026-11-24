import { expect, test } from "@playwright/test";

const prompt = `Can you explain https://example.test/${"x".repeat(200)}?`;
const reply = `${"This is a long line of ordinary prose. ".repeat(10).trimEnd()}\n  ${"y".repeat(200)}`;

for (const width of [320, 1280]) {
  test(`keeps user and assistant messages inside the chat at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== testInfo.project.use.baseURL) return route.abort();
      if (url.pathname !== "/__test/chat") return route.continue();

      return route.fulfill({
        contentType: "application/x-ndjson",
        body: `${JSON.stringify({ type: "delta", text: reply })}\n{"type":"done"}\n`,
      });
    });

    await page.goto("/");
    await page.getByLabel("Your message:").fill(prompt);
    await page.getByRole("button", { name: "Send", exact: true }).click();

    const conversation = page.getByRole("feed", {
      name: "Conversation Thread",
    });
    const bodies = conversation.getByRole("article").locator("pre");
    await expect(bodies).toHaveCount(2);
    await expect.poll(() => bodies.allTextContents()).toEqual([prompt, reply]);

    for (const body of await bodies.all()) {
      const { overflow, lines } = await body.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const feed = element.closest('[role="feed"]')?.getBoundingClientRect();
        if (!feed)
          throw new Error("Expected a conversation around the message");

        const text = document.createRange();
        text.selectNodeContents(element);
        const fragments = Array.from(text.getClientRects());
        const left = Math.max(bounds.left, feed.left);
        const right = Math.min(bounds.right, feed.right);

        return {
          overflow: Math.max(
            0,
            ...fragments.map((fragment) =>
              Math.max(left - fragment.left, fragment.right - right),
            ),
          ),
          lines: new Set(fragments.map((fragment) => fragment.top)).size,
        };
      });

      expect
        .soft(overflow, "message text fits horizontally within 1px")
        .toBeLessThanOrEqual(1);
      expect
        .soft(lines, "message occupies multiple visual lines")
        .toBeGreaterThan(1);
    }

    expect
      .soft(
        await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth <= root.clientWidth;
        }),
        "page has no horizontal overflow",
      )
      .toBe(true);

    if (width === 320 && testInfo.errors.length === 0) {
      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath("chat-wrapping-320.png"),
      });
    }
  });
}
