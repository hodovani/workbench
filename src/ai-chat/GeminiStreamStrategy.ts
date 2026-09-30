import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { LLMStrategy, Message } from "@/ai-chat/types";

export const ACTIVE_CHAT_MODEL = "gemini-3.5-flash-lite";

function buildValidContents(messages: Message[]) {
  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];

  for (const m of messages) {
    const text = m.content?.trim();
    if (!text) continue;

    const role = m.role === "user" ? "user" : "model";
    if (contents.length === 0 && role !== "user") continue;

    const last = contents.at(-1);
    if (last?.role === role) {
      last.parts.push({ text });
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  return contents;
}

export class GeminiStreamStrategy implements LLMStrategy {
  public async *generateStream(
    messages: Message[],
    apiKey: string,
  ): AsyncIterable<string> {
    const ai = new GoogleGenAI({ apiKey });
    const contents = buildValidContents(messages);

    if (contents.length === 0) return;

    const stream = await ai.models.generateContentStream({
      model: ACTIVE_CHAT_MODEL,
      contents,
      config: {
        systemInstruction:
          "Respond strictly in plain text. Do not use Markdown syntax (no asterisks, no hashes, no backticks, no HTML tags). Format and structure your response purely using paragraphs, line breaks, and whitespace indentation.",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  }
}
