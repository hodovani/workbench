"use client";

import "./metrics.css";
import { useEffect, useId, useState } from "react";
import type { MetricsSummary } from "@/metrics/types";

const timings = [
  ["browser_first", "Browser · first text"],
  ["worker_first", "Worker · first text"],
  ["worker_complete", "Worker · full reply"],
  ["save_initial", "Initial save"],
  ["save_final", "Final save"],
  ["retry_initial", "Initial save on retry"],
  ["retry_final", "Final save retry"],
] as const;

const outcomes = [
  ["send", "reply_failed", "Reply failed"],
  ["send", "save_failed", "Initial save blocked the send"],
  ["send", "interrupted", "Interrupted send"],
  ["worker", "empty", "Empty reply"],
  ["worker", "quota", "Provider quota"],
  ["worker", "upstream_error", "Provider error"],
  ["worker", "incomplete", "Incomplete stream"],
  ["worker", "disconnected", "Disconnected"],
  ["worker", "unavailable", "Worker unavailable"],
  ["save_initial", "failed", "Initial save failed"],
  ["save_final", "failed", "Final save failed"],
  ["retry_initial", "failed", "Initial save on retry failed"],
  ["retry_final", "failed", "Final save retry failed"],
] as const;

const count = (value: number) => value.toLocaleString("en-US");
const time = (ms: number | null | undefined) =>
  ms == null ? "Insufficient data" : `${count(Math.round(ms))} ms`;

function Dashboard({ data }: { data: MetricsSummary }) {
  const sectionId = useId();
  const total = (kind: keyof MetricsSummary["counts"]) =>
    Object.values(data.counts[kind] ?? {}).reduce(
      (sum, value) => sum + value,
      0,
    );
  const sends = total("send");
  const completed = data.counts.send?.completed ?? 0;
  const replies = data.counts.worker?.completed ?? 0;
  const first = data.latency.browser_first;
  const maxReplies = Math.max(1, ...data.daily.map(({ replies }) => replies));

  return (
    <>
      <p className="metrics-period">
        {data.from} to {data.through} UTC · Last 28 complete days
      </p>
      <dl className="metrics-cards">
        <div>
          <dt>Replies generated</dt>
          <dd>{count(replies)}</dd>
          <small>
            Of {count(total("worker"))} recorded Worker requests. Includes reply
            retries.
          </small>
        </div>
        <div>
          <dt>Initial sends completed</dt>
          <dd>{sends ? `${((completed / sends) * 100).toFixed(1)}%` : "—"}</dd>
          <small>
            {count(completed)} of {count(sends)} reported initial sends
          </small>
        </div>
        <div>
          <dt>Median time to first text</dt>
          <dd>{first ? time(first.p50) : "—"}</dd>
          <small>
            From Send to first text in chat state · {count(first?.n ?? 0)}{" "}
            browser samples
          </small>
        </div>
      </dl>

      <section
        className="metrics-panel"
        aria-labelledby={`${sectionId}-reply-volume`}
      >
        <h2 id={`${sectionId}-reply-volume`}>Daily replies</h2>
        {data.daily.length ? (
          <>
            <svg
              className="metrics-bars"
              viewBox={`0 0 ${data.daily.length * 10} 100`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {data.daily.map(({ day, replies }, index) => {
                const height = (replies / maxReplies) * 100;
                return (
                  <rect
                    key={day}
                    x={index * 10 + 1}
                    y={100 - height}
                    width={8}
                    height={height}
                  >
                    <title>
                      {day} UTC · {count(replies)} replies
                    </title>
                  </rect>
                );
              })}
            </svg>
            <div className="metrics-axis" aria-hidden="true">
              <span>{data.daily[0]?.day}</span>
              <span>{data.through}</span>
            </div>
            <details>
              <summary>View daily totals</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date (UTC)</th>
                    <th scope="col">Replies</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map(({ day, replies }) => (
                    <tr key={day}>
                      <th scope="row">{day}</th>
                      <td>{count(replies)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <p>
            Daily totals will appear after the first day of collected activity.
          </p>
        )}
      </section>

      <section
        className="metrics-panel"
        aria-labelledby={`${sectionId}-latency`}
      >
        <h2 id={`${sectionId}-latency`}>Latency</h2>
        <table className="metrics-timings">
          <thead>
            <tr>
              <th scope="col">Timing</th>
              <th scope="col">Median</th>
              <th scope="col">p95</th>
              <th scope="col">Count</th>
            </tr>
          </thead>
          <tbody>
            {timings.map(([key, label]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                <td
                  aria-label={
                    data.latency[key]?.p50 == null
                      ? "Insufficient data"
                      : undefined
                  }
                >
                  {data.latency[key]?.p50 == null
                    ? "—"
                    : time(data.latency[key]?.p50)}
                </td>
                <td
                  aria-label={
                    data.latency[key]?.p95 == null
                      ? "Insufficient data"
                      : undefined
                  }
                >
                  {data.latency[key]?.p95 == null
                    ? "—"
                    : time(data.latency[key]?.p95)}
                </td>
                <td>{count(data.latency[key]?.n ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Worker timings start at the Gemini request. First-text samples include
          streams that later fail. Full-reply timings include completed replies.
          A dash indicates insufficient data. p95 needs at least 20 samples.
        </p>
      </section>

      <section
        className="metrics-panel"
        aria-labelledby={`${sectionId}-outcomes`}
      >
        <h2 id={`${sectionId}-outcomes`}>Failures and interruptions</h2>
        <table className="metrics-outcomes">
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Outcome</th>
              <th scope="col">Count / total</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map(([kind, outcome, label]) => (
              <tr key={`${kind}-${outcome}`}>
                <td>
                  {kind === "worker"
                    ? "Worker"
                    : kind === "send"
                      ? "Browser"
                      : "Firestore"}
                </td>
                <th scope="row">{label}</th>
                <td>
                  {count(data.counts[kind]?.[outcome] ?? 0)} /{" "}
                  {count(total(kind))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Signed-in users wait for an initial save before generation. The final
          save preserves the result in chat history.
        </p>
      </section>

      <footer className="metrics-notes">
        <h2>About these measurements</h2>
        <p>
          A generated reply contains text and reaches Gemini completion. Browser
          reports are best effort and cover observed outcomes. Worker counts
          include direct requests.
        </p>
        <p>
          First recorded activity{" "}
          {data.startedAt
            ? `on ${data.startedAt.slice(0, 10)} UTC`
            : "is pending"}
          . Last refreshed{" "}
          <time dateTime={data.refreshedAt}>
            {data.refreshedAt.slice(0, 16).replace("T", " ")} UTC
          </time>
          .
        </p>
      </footer>
    </>
  );
}

export default function MetricsPage() {
  const [data, setData] = useState<MetricsSummary | null | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const endpoint = process.env.NEXT_PUBLIC_CHAT_API_URL;
      if (!endpoint) return null;
      const url = new URL(
        "/metrics/summary",
        new URL(endpoint, window.location.href),
      );
      const response = await fetch(url, { signal: controller.signal });
      return response.ok ? ((await response.json()) as MetricsSummary) : null;
    }
    void load().then(
      (summary) => {
        if (!controller.signal.aborted) setData(summary);
      },
      () => {
        if (!controller.signal.aborted) setData(null);
      },
    );
    return () => controller.abort();
  }, []);

  return (
    <main className="metrics-page">
      <h1>AI Chat Metrics</h1>
      <p className="metrics-lede">
        Usage, response speed, and reliability for Workbench Chat.
      </p>
      {data ? (
        <Dashboard data={data} />
      ) : (
        <p role="status">
          {data === null ? "Metrics unavailable" : "Loading metrics…"}
        </p>
      )}
    </main>
  );
}
