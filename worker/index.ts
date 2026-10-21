interface Env {
  GEMINI_API_KEY?: string;
  ALLOWED_ORIGIN?: string;
}

interface InputMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_BODY_BYTES = 64 * 1024;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
const SYSTEM_INSTRUCTION =
  "Respond strictly in plain text. Do not use Markdown syntax or HTML. Use paragraphs, line breaks, and whitespace.";

function event(type: "delta", text: string): string;
function event(type: "done"): string;
function event(type: "error", code: string): string;
function event(type: string, value?: string) {
  return `${JSON.stringify(type === "delta" ? { type, text: value } : type === "error" ? { type, code: value } : { type })}\n`;
}

function response(body: string, status: number, origin?: string) {
  const headers = new Headers({
    "content-type": "application/x-ndjson; charset=utf-8",
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return new Response(body, { status, headers });
}

async function readBody(request: Request): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    throw new RangeError("body too large");
  }
  if (!request.body) throw new TypeError("missing body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError("body too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function parseInput(value: unknown): InputMessage[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid body");
  }
  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== 1 || !Array.isArray(body.messages)) {
    throw new TypeError("invalid body");
  }
  if (body.messages.length < 1 || body.messages.length > 100) {
    throw new TypeError("invalid message count");
  }
  return body.messages.map((message): InputMessage => {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      throw new TypeError("invalid message");
    }
    const item = message as Record<string, unknown>;
    if (
      Object.keys(item).length !== 2 ||
      (item.role !== "user" && item.role !== "assistant") ||
      typeof item.content !== "string"
    ) {
      throw new TypeError("invalid message");
    }
    return { role: item.role, content: item.content };
  });
}

function sseData(block: string): string | undefined {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());
  return data.length ? data.join("\n") : undefined;
}

export function createWorker(fetcher: typeof fetch = fetch) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const origin = request.headers.get("origin") ?? undefined;
      const allowed = (env.ALLOWED_ORIGIN ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (origin && !allowed.includes(origin)) {
        return response(event("error", "invalid_request"), 403);
      }
      if (request.method === "OPTIONS") {
        if (!origin || !allowed.includes(origin)) {
          return response(event("error", "invalid_request"), 403);
        }
        const headers = new Headers({
          "access-control-allow-origin": origin,
          vary: "Origin",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
        });
        const result = new Response(null, { status: 204, headers });
        return result;
      }
      if (request.method !== "POST") {
        return response(event("error", "invalid_request"), 405, origin);
      }
      if (!env.GEMINI_API_KEY) {
        return response(event("error", "service_unavailable"), 503, origin);
      }

      let messages: InputMessage[];
      try {
        messages = parseInput(
          JSON.parse(new TextDecoder().decode(await readBody(request))),
        );
      } catch (error) {
        const tooLarge = error instanceof RangeError;
        return response(
          event("error", "invalid_request"),
          tooLarge ? 413 : 400,
          origin,
        );
      }

      const abortController = new AbortController();
      request.signal.addEventListener("abort", () => abortController.abort(), {
        once: true,
      });
      let upstream: Response;
      try {
        upstream = await fetcher(GEMINI_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            model: "gemini-3.5-flash-lite",
            system_instruction: SYSTEM_INSTRUCTION,
            input: messages.map((message) => ({
              type: message.role === "user" ? "user_input" : "model_output",
              content: [{ type: "text", text: message.content }],
            })),
            generation_config: { max_output_tokens: 1024 },
            stream: true,
            store: false,
          }),
          signal: abortController.signal,
        });
      } catch {
        return response(event("error", "service_unavailable"), 503, origin);
      }

      if (!upstream.ok || !upstream.body) {
        await upstream.body?.cancel();
        return response(
          event(
            "error",
            upstream.status === 429
              ? "quota_unavailable"
              : "service_unavailable",
          ),
          upstream.status === 429 ? 503 : 502,
          origin,
        );
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let cancelled = false;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          void (async () => {
            try {
              while (true) {
                while (true) {
                  const boundary = /\r?\n\r?\n/.exec(buffer);
                  if (!boundary) break;
                  const block = buffer.slice(0, boundary.index);
                  buffer = buffer.slice(boundary.index + boundary[0].length);
                  const data = sseData(block);
                  if (!data || data === "[DONE]") continue;
                  const parsed = JSON.parse(data) as {
                    event_type?: string;
                    delta?: { type?: string; text?: string };
                  };
                  if (parsed.event_type === "interaction.completed") {
                    controller.enqueue(new TextEncoder().encode(event("done")));
                    controller.close();
                    await reader.cancel();
                    return;
                  }
                  if (
                    parsed.event_type === "step.delta" &&
                    parsed.delta?.type === "text" &&
                    parsed.delta.text
                  ) {
                    controller.enqueue(
                      new TextEncoder().encode(
                        event("delta", parsed.delta.text),
                      ),
                    );
                  }
                }

                const { value, done } = await reader.read();
                buffer += decoder.decode(value, { stream: !done });
                if (!done) continue;
                if (buffer.trim()) {
                  const data = sseData(buffer);
                  if (data && data !== "[DONE]") {
                    const parsed = JSON.parse(data) as {
                      event_type?: string;
                      delta?: { type?: string; text?: string };
                    };
                    if (parsed.event_type === "interaction.completed") {
                      controller.enqueue(
                        new TextEncoder().encode(event("done")),
                      );
                      controller.close();
                      return;
                    }
                    if (
                      parsed.event_type === "step.delta" &&
                      parsed.delta?.type === "text" &&
                      parsed.delta.text
                    ) {
                      controller.enqueue(
                        new TextEncoder().encode(
                          event("delta", parsed.delta.text),
                        ),
                      );
                    }
                  }
                }
                controller.enqueue(
                  new TextEncoder().encode(
                    event("error", "service_unavailable"),
                  ),
                );
                controller.close();
                return;
              }
            } catch {
              if (cancelled) return;
              controller.enqueue(
                new TextEncoder().encode(event("error", "service_unavailable")),
              );
              controller.close();
            }
          })();
        },
        async cancel() {
          cancelled = true;
          abortController.abort();
          await reader.cancel();
        },
      });
      return new Response(body, {
        headers: {
          "content-type": "application/x-ndjson; charset=utf-8",
          "cache-control": "no-store",
          ...(origin
            ? { "access-control-allow-origin": origin, vary: "Origin" }
            : {}),
        },
      });
    },
  };
}

const worker = createWorker();
export default worker;
