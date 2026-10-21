import type { Message } from "@/ai-chat/types";

type ChatMessage = Pick<Message, "role" | "content">;
type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; code: string };

export class ProxyStreamStrategy {
  constructor(
    private readonly endpoint = process.env.NEXT_PUBLIC_CHAT_API_URL ?? "",
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  public async *generateStream(
    messages: Message[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    if (!this.endpoint) throw new Error("service_unavailable");

    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: messages.map(
          ({ role, content }): ChatMessage => ({ role, content }),
        ),
      }),
      ...(signal ? { signal } : {}),
    });
    if (!response.body)
      throw new Error(`service_unavailable (${response.status})`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let complete = false;
    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        if (done && buffer.trim()) lines.push(buffer);

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "delta" && event.text) yield event.text;
          else if (event.type === "error") throw new Error(event.code);
          else if (event.type === "done") complete = true;
        }
        if (done) break;
      }
      if (!response.ok)
        throw new Error(`service_unavailable (${response.status})`);
      if (!complete) throw new Error("Stream ended unexpectedly");
    } finally {
      reader.releaseLock();
    }
  }
}
