import type { BrowserMetric } from "@/metrics/types";

export function reportMetric(metric: BrowserMetric): void {
  const endpoint = process.env.NEXT_PUBLIC_CHAT_API_URL;
  if (!endpoint || typeof window === "undefined") return;
  try {
    const url = new URL(
      "/metrics/events",
      new URL(endpoint, window.location.href),
    );
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        ...metric,
        ms:
          metric.ms === null ? null : Math.min(600_000, Math.round(metric.ms)),
        id: crypto.randomUUID(),
      }),
    }).catch(() => {});
  } catch {
    // Reporting is best effort, including when the endpoint is misconfigured.
  }
}
