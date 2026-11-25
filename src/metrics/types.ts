export type SaveKind =
  | "save_initial"
  | "save_final"
  | "retry_initial"
  | "retry_final";

export type BrowserMetric =
  | {
      kind: "send";
      outcome: "completed" | "reply_failed" | "save_failed" | "interrupted";
      ms: number | null;
    }
  | { kind: SaveKind; outcome: "ok" | "failed"; ms: number };

interface Latency {
  n: number;
  p50: number | null;
  p95: number | null;
}

export interface MetricsSummary {
  from: string;
  through: string;
  startedAt: string | null;
  refreshedAt: string;
  daily: { day: string; replies: number }[];
  counts: Partial<
    Record<BrowserMetric["kind"] | "worker", Record<string, number>>
  >;
  latency: Partial<
    Record<
      "browser_first" | "worker_first" | "worker_complete" | SaveKind,
      Latency
    >
  >;
}
