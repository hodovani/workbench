import { expect, it, vi } from "vitest";
import { ChatMediator } from "./ChatMediator";
import {
  accountFixture,
  controlledStrategy,
} from "./ChatMediator.test-helpers";

it("reports a completed initial send even if the final save fails, and counts the save retry separately", async () => {
  const { strategy, calls } = controlledStrategy();
  const report = vi.fn();
  const mediator = new ChatMediator(undefined, strategy, report);
  const account = accountFixture("private-user");
  const save = vi.spyOn(account.repository, "saveExchange");
  save
    .mockImplementationOnce(async () => {})
    .mockRejectedValueOnce(Error("private error"));
  await mediator.attach(account.repository, account.userId);

  const sending = mediator.sendMessage("private prompt");
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  calls[0]?.stream.push("private reply");
  calls[0]?.stream.finish();
  await sending;
  await mediator.retrySave();

  expect(report.mock.calls).toEqual([
    [{ kind: "save_initial", outcome: "ok", ms: expect.any(Number) }],
    [{ kind: "send", outcome: "completed", ms: expect.any(Number) }],
    [{ kind: "save_final", outcome: "failed", ms: expect.any(Number) }],
    [{ kind: "retry_final", outcome: "ok", ms: expect.any(Number) }],
  ]);
});

it("records initial save failure without making a generation request", async () => {
  const { strategy, calls } = controlledStrategy();
  const report = vi.fn();
  const mediator = new ChatMediator(undefined, strategy, report);
  const account = accountFixture("private-user");
  vi.spyOn(account.repository, "saveExchange").mockRejectedValueOnce(Error());
  await mediator.attach(account.repository, account.userId);
  await mediator.sendMessage("private prompt");

  expect(calls).toHaveLength(0);
  expect(report.mock.calls).toEqual([
    [{ kind: "save_initial", outcome: "failed", ms: expect.any(Number) }],
    [{ kind: "send", outcome: "save_failed", ms: null }],
  ]);
});

it("records interruption once and excludes a reply retry from initial sends", async () => {
  const { strategy, calls } = controlledStrategy();
  const report = vi.fn();
  const mediator = new ChatMediator(undefined, strategy, report);
  const sending = mediator.sendMessage("private prompt");
  mediator.release();
  await sending;
  const retry = mediator.retryLastMessage();
  calls[1]?.stream.push("hello");
  calls[1]?.stream.finish();
  await retry;

  expect(report.mock.calls).toEqual([
    [{ kind: "send", outcome: "interrupted", ms: null }],
  ]);
});
