import { describe, expect, it, vi } from "vitest";
import { ProxyStreamStrategy } from "./ProxyStreamStrategy";
import type { Message } from "./types";

const messages: Message[] = [
  { id: "1", role: "user", content: "hello", timestamp: 0, status: "done" },
];

async function collect(stream: AsyncIterable<string>) {
  const chunks: string[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

describe("ProxyStreamStrategy", () => {
  it("reports a missing endpoint without making a same-origin request", async () => {
    const fetcher = vi.fn();
    const strategy = new ProxyStreamStrategy("", fetcher);

    await expect(collect(strategy.generateStream(messages))).rejects.toThrow(
      "service_unavailable",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("calls the browser fetch function with its required global receiver", async () => {
    const fetcher = vi.fn(function (this: unknown) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(new Response('{"type":"done"}\n'));
    });
    vi.stubGlobal("fetch", fetcher);
    const strategy = new ProxyStreamStrategy("/chat");

    await expect(collect(strategy.generateStream(messages))).resolves.toEqual(
      [],
    );
    expect(fetcher).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("sends only role and content and yields split NDJSON deltas", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            const encoded = new TextEncoder().encode(
              '{"type":"delta","text":"Hi"}\n{"type":"done"}\n',
            );
            controller.enqueue(encoded.slice(0, 17));
            controller.enqueue(encoded.slice(17));
            controller.close();
          },
        }),
      ),
    );
    const strategy = new ProxyStreamStrategy("/chat", fetcher);

    await expect(collect(strategy.generateStream(messages))).resolves.toEqual([
      "Hi",
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      "/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "hello" }],
        }),
      }),
    );
  });

  it("ignores empty text deltas", async () => {
    const strategy = new ProxyStreamStrategy(
      "/chat",
      async () =>
        new Response(
          '{"type":"delta","text":""}\n{"type":"delta","text":"ok"}\n{"type":"done"}\n',
        ),
    );
    await expect(collect(strategy.generateStream(messages))).resolves.toEqual([
      "ok",
    ]);
  });

  it("rejects terminal errors and premature EOF", async () => {
    const errorStrategy = new ProxyStreamStrategy(
      "/chat",
      async () => new Response('{"type":"error","code":"quota_unavailable"}\n'),
    );
    await expect(
      collect(errorStrategy.generateStream(messages)),
    ).rejects.toThrow("quota_unavailable");

    const eofStrategy = new ProxyStreamStrategy(
      "/chat",
      async () => new Response(""),
    );
    await expect(collect(eofStrategy.generateStream(messages))).rejects.toThrow(
      "ended unexpectedly",
    );
  });

  it("preserves safe proxy error codes from non-success responses", async () => {
    const strategy = new ProxyStreamStrategy(
      "/chat",
      async () =>
        new Response('{"type":"error","code":"quota_unavailable"}\n', {
          status: 503,
        }),
    );
    await expect(collect(strategy.generateStream(messages))).rejects.toThrow(
      "quota_unavailable",
    );
  });
});
