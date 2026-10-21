import { describe, expect, it } from "vitest";
import { ChatMediator } from "./ChatMediator";
import {
  accountFixture,
  controlledStrategy,
  deferred,
  message,
} from "./ChatMediator.test-helpers";
import { ObservableThreadStore } from "./ThreadStore";

describe("ChatMediator guest and signed-in flows", () => {
  it("generates for a guest without a repository and locks a second send while streaming", async () => {
    const { strategy, calls } = controlledStrategy();
    const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
    const first = mediator.sendMessage("hello");

    expect(calls).toHaveLength(1);
    expect(mediator.getSnapshot().userId).toBeNull();
    expect(mediator.getSnapshot().threadId).toBeTruthy();
    expect(await mediator.sendMessage("too soon")).toBe(false);
    expect(mediator.getThreadStore().getSnapshot()).toHaveLength(2);

    calls[0]?.stream.push("guest reply");
    calls[0]?.stream.finish();
    await first;
    expect(
      mediator
        .getThreadStore()
        .getSnapshot()
        .map(({ content }) => content),
    ).toEqual(["hello", "guest reply"]);
  });

  it("saves the pending exchange before generating for a signed-in user", async () => {
    const account = accountFixture("account-a");
    const events: string[] = [];
    const save = account.repository.saveExchange.bind(account.repository);
    account.repository.saveExchange = async (...args) => {
      events.push(`save:${args[3].status}`);
      await save(...args);
    };
    const strategy = {
      async *generateStream() {
        events.push("generate");
        yield "reply";
      },
    };
    const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
    await mediator.attach(account.repository, account.userId);

    await mediator.sendMessage("durable prompt");

    expect(events).toEqual(["save:loading", "generate", "save:done"]);
    expect(mediator.getSnapshot().threads[0]?.title).toBe("durable prompt");
    expect(
      account.records.get(mediator.getSnapshot().threadId ?? "")?.messages,
    ).toEqual([
      expect.objectContaining({
        role: "user",
        content: "durable prompt",
        status: "done",
      }),
      expect.objectContaining({
        role: "assistant",
        content: "reply",
        status: "done",
      }),
    ]);
  });

  it("retries an initial save with the same message IDs before generating once", async () => {
    const account = accountFixture("account-a");
    const originalSave = account.repository.saveExchange.bind(
      account.repository,
    );
    let failFirst = true;
    account.repository.saveExchange = async (...args) => {
      if (failFirst) {
        failFirst = false;
        throw new Error("offline");
      }
      await originalSave(...args);
    };
    const { strategy, calls } = controlledStrategy();
    const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
    await mediator.attach(account.repository, account.userId);

    expect(await mediator.sendMessage("recover me")).toBe(false);
    const beforeRetry = mediator.getThreadStore().getSnapshot();
    expect(mediator.getSnapshot().recovery).toBe("save");
    const retry = mediator.retrySave();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toHaveLength(1);
    calls[0]?.stream.finish();
    expect(await retry).toBe(true);

    expect(account.saves).toHaveLength(2);
    expect(account.saves[0]?.prompt.id).toBe(beforeRetry[0]?.id);
    expect(account.saves[0]?.response.id).toBe(beforeRetry[1]?.id);
    expect(account.saves[1]?.prompt.id).toBe(beforeRetry[0]?.id);
    expect(account.saves[1]?.response.id).toBe(beforeRetry[1]?.id);
  });

  it("retries a failed final save without calling the model again", async () => {
    const account = accountFixture("account-a");
    const originalSave = account.repository.saveExchange.bind(
      account.repository,
    );
    let failed = false;
    account.repository.saveExchange = async (...args) => {
      if (args[3].status === "done" && !failed) {
        failed = true;
        throw new Error("offline after response");
      }
      await originalSave(...args);
    };
    let generations = 0;
    const strategy = {
      async *generateStream() {
        generations += 1;
        yield "saved visibly";
      },
    };
    const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
    await mediator.attach(account.repository, account.userId);

    await mediator.sendMessage("finish then save");
    expect(mediator.getSnapshot().recovery).toBe("save");
    expect(mediator.getThreadStore().getSnapshot()[1]?.content).toBe(
      "saved visibly",
    );
    expect(await mediator.retrySave()).toBe(true);

    expect(generations).toBe(1);
    expect(mediator.getSnapshot().recovery).toBeNull();
    expect(
      account.records.get(mediator.getSnapshot().threadId ?? "")?.messages,
    ).toHaveLength(2);
  });

  it("imports a guest transcript with its UUID and interrupted partial response", async () => {
    const { strategy, calls } = controlledStrategy();
    const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
    const send = mediator.sendMessage("keep my history");
    const guestId = mediator.getSnapshot().threadId;
    calls[0]?.stream.push("partial answer");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const account = accountFixture("account-a", [
      {
        id: "existing-chat",
        title: "Existing",
        createdAt: 1,
        updatedAt: 2,
        messages: [message("existing-prompt", "user", "existing history")],
      },
    ]);
    await mediator.attach(account.repository, account.userId);
    await send;

    expect(account.imports).toHaveLength(1);
    expect(account.imports[0]?.id).toBe(guestId);
    expect(account.records.has("existing-chat")).toBe(true);
    expect(account.imports[0]?.messages).toEqual([
      expect.objectContaining({
        role: "user",
        content: "keep my history",
        status: "done",
      }),
      expect.objectContaining({
        role: "assistant",
        content: "partial answer",
        status: "interrupted",
      }),
    ]);
    expect(mediator.getSnapshot().threadId).toBe(guestId);
    expect(mediator.getSnapshot().canRetry).toBe(true);
  });

  it("ignores an import that resolves after switching accounts", async () => {
    const guestStrategy = {
      async *generateStream() {
        yield "guest answer";
      },
    };
    const mediator = new ChatMediator(
      new ObservableThreadStore(),
      guestStrategy,
    );
    await mediator.sendMessage("private guest transcript");

    const accountA = accountFixture("account-a");
    const importStarted = deferred<void>();
    const finishImport = deferred<void>();
    accountA.repository.importGuestThread = async () => {
      importStarted.resolve();
      await finishImport.promise;
    };
    const attachingA = mediator.attach(accountA.repository, accountA.userId);
    await importStarted.promise;

    const accountB = accountFixture("account-b", [
      {
        id: "b-thread",
        title: "B only",
        createdAt: 1,
        updatedAt: 3,
        messages: [message("b-message", "user", "B history")],
      },
    ]);
    await mediator.attach(accountB.repository, accountB.userId);
    finishImport.resolve();
    await attachingA;

    expect(mediator.getSnapshot().userId).toBe("account-b");
    expect(
      mediator
        .getThreadStore()
        .getSnapshot()
        .map(({ content }) => content),
    ).toEqual(["B history"]);
    expect(accountB.records.has(mediator.getSnapshot().threadId ?? "")).toBe(
      true,
    );
  });

  it("keeps a failed guest import retryable with the same frozen thread", async () => {
    const mediator = new ChatMediator(new ObservableThreadStore(), {
      async *generateStream() {
        yield "answer";
      },
    });
    await mediator.sendMessage("import me");
    const guestId = mediator.getSnapshot().threadId;
    const account = accountFixture("account-a");
    const importThread = account.repository.importGuestThread.bind(
      account.repository,
    );
    let fail = true;
    account.repository.importGuestThread = async (...args) => {
      if (fail) {
        fail = false;
        throw new Error("temporarily unavailable");
      }
      await importThread(...args);
    };

    await mediator.attach(account.repository, account.userId);
    const failedSnapshot = mediator.getSnapshot();
    expect(failedSnapshot.recovery).toBe("save");
    expect(failedSnapshot.messages.map(({ content }) => content)).toEqual([
      "import me",
      "answer",
    ]);
    expect(await mediator.selectThread("other")).toBe(false);
    expect(await mediator.sendMessage("blocked until saved")).toBe(false);

    expect(await mediator.retrySave()).toBe(true);
    expect(account.imports).toHaveLength(1);
    expect(account.imports[0]?.id).toBe(guestId);
    expect(mediator.getSnapshot().recovery).toBeNull();
  });

  it("does not let account A's load replace account B after switching", async () => {
    const accountA = accountFixture("account-a");
    const aLoad = deferred<import("@/storage/types").ChatThread | null>();
    const originalAGet = accountA.repository.getThread.bind(
      accountA.repository,
    );
    accountA.repository.getThread = async (_uid, threadId) =>
      threadId === "a-thread"
        ? aLoad.promise
        : originalAGet("account-a", threadId);
    const listA = accountA.repository.listThreads.bind(accountA.repository);
    accountA.repository.listThreads = async () => [
      { id: "a-thread", title: "A", createdAt: 1, updatedAt: 1 },
      ...(await listA("account-a")),
    ];

    const mediator = new ChatMediator();
    const loadingA = mediator.attach(accountA.repository, accountA.userId);
    const accountB = accountFixture("account-b", [
      {
        id: "b-thread",
        title: "B",
        createdAt: 1,
        updatedAt: 2,
        messages: [message("b-prompt", "user", "B only")],
      },
    ]);
    await mediator.attach(accountB.repository, accountB.userId);
    aLoad.resolve({
      id: "a-thread",
      title: "A",
      createdAt: 1,
      updatedAt: 1,
      messages: [message("a-prompt", "user", "A secret")],
    });
    await loadingA;

    expect(mediator.getSnapshot().userId).toBe("account-b");
    expect(mediator.getSnapshot().threadId).toBe("b-thread");
    expect(
      mediator.getSnapshot().messages.map(({ content }) => content),
    ).toEqual(["B only"]);
  });

  it("aborts on release without duplicating a stream after remount", async () => {
    const account = accountFixture("account-a");
    const { strategy, calls } = controlledStrategy();
    const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
    await mediator.attach(account.repository, account.userId);
    const send = mediator.sendMessage("persist once");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toHaveLength(1);
    const responseId = mediator.getSnapshot().messages[1]?.id;

    mediator.release();
    await mediator.attach(account.repository, account.userId);
    await send;

    expect(calls).toHaveLength(1);
    expect(mediator.getSnapshot().messages[1]).toEqual(
      expect.objectContaining({ id: responseId, status: "interrupted" }),
    );
    expect(account.saves).toHaveLength(1);
  });

  it("keeps an uncertain initial save retryable when release happens before acknowledgement", async () => {
    const account = accountFixture("account-a");
    const initialWrite = deferred<void>();
    const writeStarted = deferred<void>();
    const normalSave = account.repository.saveExchange.bind(account.repository);
    let saves = 0;
    account.repository.saveExchange = async (...args) => {
      saves += 1;
      if (saves === 1) {
        writeStarted.resolve();
        await initialWrite.promise;
      } else {
        await normalSave(...args);
      }
    };
    const { strategy, calls } = controlledStrategy();
    const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
    await mediator.attach(account.repository, account.userId);
    const sending = mediator.sendMessage("save then release");
    await writeStarted.promise;

    mediator.release();
    await mediator.attach(account.repository, account.userId);
    initialWrite.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    calls[0]?.stream.finish();
    await sending;

    expect(mediator.getSnapshot().recovery).toBe("save");
    expect(calls).toHaveLength(0);
    const retry = mediator.retrySave();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toHaveLength(1);
    calls[0]?.stream.finish();
    expect(await retry).toBe(true);
    expect(saves).toBe(3);
  });

  it("loads the newest saved thread and switches between saved conversations", async () => {
    const account = accountFixture("account-a", [
      {
        id: "older",
        title: "Older",
        createdAt: 1,
        updatedAt: 2,
        messages: [message("older-prompt", "user", "older history")],
      },
      {
        id: "newer",
        title: "Newer",
        createdAt: 1,
        updatedAt: 3,
        messages: [message("newer-prompt", "user", "newer history")],
      },
    ]);
    const mediator = new ChatMediator();
    await mediator.attach(account.repository, account.userId);

    expect(mediator.getSnapshot().threadId).toBe("newer");
    expect(
      mediator.getSnapshot().messages.map(({ content }) => content),
    ).toEqual(["newer history"]);
    expect(await mediator.selectThread("older")).toBe(true);
    expect(
      mediator.getSnapshot().messages.map(({ content }) => content),
    ).toEqual(["older history"]);
    expect(mediator.newThread()).toBe(true);
    expect(mediator.getSnapshot().threadId).toBeNull();
    expect(mediator.getSnapshot().messages).toEqual([]);
    expect(account.records.size).toBe(2);
  });

  it("retries a reloaded interrupted response from stored messages with stable IDs", async () => {
    const account = accountFixture("account-a", [
      {
        id: "saved-thread",
        title: "Saved",
        createdAt: 1,
        updatedAt: 2,
        messages: [
          message("saved-prompt", "user", "ask from storage"),
          message(
            "saved-response",
            "assistant",
            "partial old answer",
            "interrupted",
          ),
        ],
      },
    ]);
    let history: Array<{ id: string; content: string }> = [];
    const strategy = {
      async *generateStream(messages: Array<{ id: string; content: string }>) {
        history = messages;
        yield "replacement";
      },
    };
    const mediator = new ChatMediator(new ObservableThreadStore(), strategy);
    await mediator.attach(account.repository, account.userId);

    expect(mediator.getSnapshot().canRetry).toBe(true);
    expect(await mediator.retryLastMessage()).toBe(true);

    expect(history).toEqual([
      expect.objectContaining({
        id: "saved-prompt",
        content: "ask from storage",
      }),
    ]);
    expect(mediator.getSnapshot().messages.map(({ id }) => id)).toEqual([
      "saved-prompt",
      "saved-response",
    ]);
    expect(mediator.getSnapshot().messages.at(-1)?.content).toBe("replacement");
  });

  it("ignores a rejected account A save after the user switches to account B", async () => {
    const accountA = accountFixture("account-a");
    const aWrite = deferred<void>();
    accountA.repository.saveExchange = async () => aWrite.promise;
    const mediator = new ChatMediator(new ObservableThreadStore(), {
      async *generateStream() {
        yield "never reached";
      },
    });
    await mediator.attach(accountA.repository, accountA.userId);
    const sendingA = mediator.sendMessage("A prompt");

    const accountB = accountFixture("account-b", [
      {
        id: "b-thread",
        title: "B",
        createdAt: 1,
        updatedAt: 2,
        messages: [message("b-prompt", "user", "B transcript")],
      },
    ]);
    await mediator.attach(accountB.repository, accountB.userId);
    aWrite.reject(new Error("A storage failed"));
    await sendingA;

    expect(mediator.getSnapshot().userId).toBe("account-b");
    expect(mediator.getSnapshot().error).toBeNull();
    expect(mediator.getSnapshot().recovery).toBeNull();
    expect(
      mediator.getSnapshot().messages.map(({ content }) => content),
    ).toEqual(["B transcript"]);
  });

  it("recovers pending responses as interrupted after loading", async () => {
    const store = new ObservableThreadStore();
    store.hydrate([message("pending", "assistant", "partial", "streaming")]);

    expect(store.getSnapshot()[0]?.status).toBe("interrupted");
  });
});
