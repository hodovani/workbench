import { describe, expect, it, vi } from "vitest";
import { createWorker } from "./index";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://worker.test/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function upstream(events: string[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const event of events)
          controller.enqueue(new TextEncoder().encode(event));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}

describe("Gemini proxy Worker", () => {
  it("streams text deltas and completion using a server-owned model and secret", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        upstream([
          'event: step.delta\ndata: {"event_type":"step.delta","delta":{"type":"text","text":"Hello"}}\n\n',
          'event: interaction.completed\ndata: {"event_type":"interaction.completed"}\n\n',
        ]),
      );
    const app = createWorker(fetcher);
    const response = await app.fetch(
      request(
        { messages: [{ role: "user", content: "hi" }] },
        { origin: "https://site.test" },
      ),
      { GEMINI_API_KEY: "private", ALLOWED_ORIGIN: "https://site.test" },
    );

    const output = await response.text();
    expect(output).toBe('{"type":"delta","text":"Hello"}\n{"type":"done"}\n');
    expect(fetcher).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-goog-api-key": "private" }),
        body: expect.stringContaining(
          '"model":"gemini-3.5-flash-lite","system_instruction":',
        ),
      }),
    );
    const upstreamBody = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(upstreamBody.generation_config.max_output_tokens).toBe(1024);
    expect(upstreamBody.input).toEqual([
      { type: "user_input", content: [{ type: "text", text: "hi" }] },
    ]);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://site.test",
    );
    expect(output).not.toContain("private");
  });

  it("rejects client-controlled config and missing secrets before upstream work", async () => {
    const fetcher = vi.fn();
    const app = createWorker(fetcher);
    const invalid = await app.fetch(
      request({
        messages: [{ role: "tool", content: "bad" }],
        model: "other",
        url: "https://evil.test",
        apiKey: "client-key",
      }),
      { GEMINI_API_KEY: "private" },
    );
    const missingKey = await app.fetch(request({ messages: [] }), {});
    const wrongMethod = await app.fetch(
      new Request("https://worker.test/chat"),
      {
        GEMINI_API_KEY: "private",
      },
    );
    const blockedOrigin = await app.fetch(
      request(
        { messages: [{ role: "user", content: "hi" }] },
        { origin: "https://evil.test" },
      ),
      { GEMINI_API_KEY: "private", ALLOWED_ORIGIN: "https://site.test" },
    );

    expect(invalid.status).toBe(400);
    expect(await invalid.text()).toContain('"code":"invalid_request"');
    expect(missingKey.status).toBe(503);
    expect(await missingKey.text()).toContain('"code":"service_unavailable"');
    expect(wrongMethod.status).toBe(405);
    expect(blockedOrigin.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps quota failures without exposing upstream error text", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("private details", { status: 429 }));
    const response = await createWorker(fetcher).fetch(
      request({ messages: [{ role: "user", content: "hi" }] }),
      { GEMINI_API_KEY: "private" },
    );

    expect(response.status).toBe(503);
    const output = await response.text();
    expect(output).toContain('"code":"quota_unavailable"');
    expect(output).not.toContain("private details");
  });

  it("rejects oversized bodies and overlong histories before contacting Gemini", async () => {
    const fetcher = vi.fn();
    const app = createWorker(fetcher);
    const tooLarge = await app.fetch(
      new Request("https://worker.test/chat", {
        method: "POST",
        headers: {
          "content-length": "65537",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      { GEMINI_API_KEY: "private" },
    );
    const tooMany = await app.fetch(
      request({
        messages: Array.from({ length: 101 }, () => ({
          role: "user",
          content: "x",
        })),
      }),
      { GEMINI_API_KEY: "private" },
    );

    expect(tooLarge.status).toBe(413);
    expect(tooMany.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("normalizes upstream network failures and cancels upstream work on disconnect", async () => {
    const failed = await createWorker(async () => {
      throw new Error("secret-bearing transport detail");
    }).fetch(request({ messages: [{ role: "user", content: "hi" }] }), {
      GEMINI_API_KEY: "private",
    });
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        return new Response(new ReadableStream<Uint8Array>({ pull() {} }));
      },
    );
    const streaming = await createWorker(fetcher).fetch(
      request({ messages: [{ role: "user", content: "hi" }] }),
      { GEMINI_API_KEY: "private" },
    );
    await streaming.body?.cancel();

    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("secret-bearing");
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("parses upstream SSE frames split across transport chunks", async () => {
    const frame =
      'event: step.delta\ndata: {"event_type":"step.delta","delta":{"type":"text","text":"Split"}}\n\n' +
      'event: interaction.completed\ndata: {"event_type":"interaction.completed"}\n\n';
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            const encoded = new TextEncoder().encode(frame);
            controller.enqueue(encoded.slice(0, 11));
            controller.enqueue(encoded.slice(11, 59));
            controller.enqueue(encoded.slice(59));
            controller.close();
          },
        }),
      ),
    );
    const response = await createWorker(fetcher).fetch(
      request({ messages: [{ role: "user", content: "hi" }] }),
      { GEMINI_API_KEY: "private" },
    );

    expect(await response.text()).toBe(
      '{"type":"delta","text":"Split"}\n{"type":"done"}\n',
    );
  });

  it("normalizes failures after a partial upstream stream", async () => {
    let emitted = false;
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          pull(controller) {
            if (emitted) {
              controller.error(new Error("upstream secret detail"));
            } else {
              emitted = true;
              controller.enqueue(
                new TextEncoder().encode(
                  'event: step.delta\ndata: {"event_type":"step.delta","delta":{"type":"text","text":"Part"}}\n\n',
                ),
              );
            }
          },
        }),
      ),
    );
    const response = await createWorker(fetcher).fetch(
      request({ messages: [{ role: "user", content: "hi" }] }),
      { GEMINI_API_KEY: "private" },
    );
    const output = await response.text();

    expect(output).toContain('{"type":"delta","text":"Part"}');
    expect(output).toContain('{"type":"error","code":"service_unavailable"}');
    expect(output).not.toContain("upstream secret detail");
  });
});
