import { describe, expect, it, vi } from "vitest";
import type { Message } from "@/ai-chat/types";
import type { ChatRepository, ChatThread } from "@/storage/types";
import { ChatMediator } from "./ChatMediator";
import {
  accountFixture,
  controlledStrategy,
} from "./ChatMediator.test-helpers";
import { ObservableThreadStore } from "./ThreadStore";

const message = (content: string): Message => ({
  id: content,
  role: "user",
  content,
  timestamp: 1,
  status: "done",
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("ChatMediator session lifecycle", () => {
  it("does not let a load from an earlier same-account session replace the current thread", async () => {
    const oldLoad = deferred<ChatThread | null>();
    const staleRepository: ChatRepository = {
      listThreads: async () => [
        { id: "current", title: "Old", createdAt: 1, updatedAt: 1 },
      ],
      getThread: () => oldLoad.promise,
      importGuestThread: async () => {},
      saveExchange: async () => {},
    };
    const currentThread: ChatThread = {
      id: "current",
      title: "Current",
      createdAt: 1,
      updatedAt: 2,
      messages: [message("current session")],
    };
    const currentRepository: ChatRepository = {
      listThreads: async () => [
        { id: "current", title: "Current", createdAt: 1, updatedAt: 2 },
      ],
      getThread: async () => currentThread,
      importGuestThread: async () => {},
      saveExchange: async () => {},
    };
    const mediator = new ChatMediator(new ObservableThreadStore());

    const staleAttach = mediator.attach(staleRepository, "account-a");
    mediator.detach();
    await mediator.attach(currentRepository, "account-a");
    oldLoad.resolve({
      id: "current",
      title: "Old",
      createdAt: 1,
      updatedAt: 1,
      messages: [message("stale session")],
    });
    await staleAttach;

    expect(
      mediator
        .getThreadStore()
        .getSnapshot()
        .map(({ content }) => content),
    ).toEqual(["current session"]);
  });
});

it("lets a guest send immediately and keeps the transcript in memory", async () => {
  const generated: string[] = [];
  const strategy = {
    async *generateStream(messages: Message[]) {
      generated.push(messages.at(-1)?.content ?? "");
      yield "guest reply";
    },
  };
  const mediator = new ChatMediator(new ObservableThreadStore(), strategy);

  await mediator.sendMessage("hello without an account");

  expect(generated).toEqual(["hello without an account"]);
  expect(
    mediator
      .getThreadStore()
      .getSnapshot()
      .map(({ content }) => content),
  ).toEqual(["hello without an account", "guest reply"]);
});

it("commits a signed-in prompt and pending response before starting generation", async () => {
  const events: string[] = [];
  const repository: ChatRepository = {
    listThreads: async () => [],
    getThread: async () => null,
    importGuestThread: async () => {},
    saveExchange: async (_uid, _threadId, _prompt, response) => {
      events.push(`saved:${response.status}`);
    },
  };
  const strategy = {
    async *generateStream() {
      events.push("generated");
      yield "saved reply";
    },
  };
  const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
  await mediator.attach(repository, "account-a");

  await mediator.sendMessage("durable prompt");

  expect(events).toEqual(["saved:loading", "generated", "saved:done"]);
});

it("recovers a saved conversation after a transient load failure", async () => {
  const thread = {
    id: "saved",
    title: "Saved",
    createdAt: 1,
    updatedAt: 1,
    messages: [message("saved prompt")],
  };
  const { repository, userId } = accountFixture("account-a", [thread]);
  const getThread = vi.spyOn(repository, "getThread");
  getThread.mockRejectedValueOnce(new Error("offline"));
  const mediator = new ChatMediator();

  await mediator.attach(repository, userId);
  expect(mediator.getSnapshot()).toMatchObject({
    recovery: "load",
    error: "offline",
  });

  getThread.mockRejectedValueOnce(new Error("still offline"));
  expect(await mediator.retryLoad()).toBe(false);
  expect(mediator.getSnapshot()).toMatchObject({
    recovery: "load",
    error: "still offline",
  });

  expect(await mediator.retryLoad()).toBe(true);
  expect(mediator.getSnapshot()).toMatchObject({
    threadId: thread.id,
    phase: "idle",
    recovery: null,
    error: null,
    messages: thread.messages,
  });
});

it("retries a reply after recovering from a save failure", async () => {
  const { strategy, calls } = controlledStrategy();
  const { repository, userId } = accountFixture("account-a");
  const mediator = new ChatMediator(undefined, strategy);
  await mediator.attach(repository, userId);

  const initial = mediator.sendMessage("prompt");
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  calls[0]?.stream.fail(new Error("upstream error"));
  await initial;
  expect(mediator.getSnapshot().messages.at(-1)).toMatchObject({
    status: "error",
    content: "upstream error",
  });

  vi.spyOn(repository, "saveExchange").mockRejectedValueOnce(
    new Error("offline"),
  );
  expect(await mediator.retryLastMessage()).toBe(false);
  expect(calls).toHaveLength(1);
  expect(mediator.getSnapshot()).toMatchObject({
    recovery: "save",
    error: "offline",
  });

  const retry = mediator.retrySave();
  await vi.waitFor(() => expect(calls).toHaveLength(2));
  calls[1]?.stream.push("recovered reply");
  calls[1]?.stream.finish();
  expect(await retry).toBe(true);
  expect(mediator.getSnapshot().messages.at(-1)).toMatchObject({
    status: "done",
    content: "recovered reply",
  });
});
