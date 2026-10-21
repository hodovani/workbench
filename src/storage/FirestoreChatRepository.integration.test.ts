import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Message } from "@/ai-chat/types";
import { FirestoreChatRepository } from "./FirestoreChatRepository";

let environment: RulesTestEnvironment;
const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const [hostname, port] = host.split(":");
const describeEmulator = process.env.FIRESTORE_EMULATOR_HOST
  ? describe
  : describe.skip;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: `guest-chat-${process.pid}`,
    firestore: {
      host: hostname,
      port: Number(port),
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => environment.clearFirestore());
afterAll(async () => environment?.cleanup());

const message = (
  id: string,
  role: Message["role"],
  timestamp: number,
  content = id,
): Message => ({
  id,
  role,
  content,
  timestamp,
  status: "done",
});

describeEmulator("FirestoreChatRepository (Firestore emulator)", () => {
  it("atomically saves an exchange, updates the same response ID, and preserves older messages", async () => {
    const db = environment.authenticatedContext("owner").firestore();
    const repo = new FirestoreChatRepository(db as unknown as Firestore);
    const prompt1 = message("p1", "user", 10);
    const response1 = message("r1", "assistant", 11, "pending");
    await repo.saveExchange("owner", "thread", prompt1, response1);
    await repo.saveExchange("owner", "thread", prompt1, {
      ...response1,
      content: "final",
    });
    const prompt2 = message("p2", "user", 12);
    const response2 = message("r2", "assistant", 13);
    await repo.saveExchange("owner", "thread", prompt2, response2);

    expect(await repo.getThread("owner", "thread")).toEqual({
      id: "thread",
      title: "p1",
      createdAt: 10,
      updatedAt: 13,
      messages: [
        prompt1,
        { ...response1, content: "final" },
        prompt2,
        response2,
      ],
    });
    const messages = await getDocs(
      collection(db, "users", "owner", "threads", "thread", "messages"),
    );
    expect(messages.size).toBe(4);
  });

  it("imports once, accepts the same fingerprint after later changes, and rejects conflicting reuse", async () => {
    const db = environment.authenticatedContext("owner").firestore();
    const repo = new FirestoreChatRepository(db as unknown as Firestore);
    const thread = {
      id: "guest",
      title: "hello",
      createdAt: 1,
      updatedAt: 2,
      messages: [
        message("p", "user", 1, "hello"),
        message("r", "assistant", 2, "hi"),
      ],
    };
    const [prompt, response] = thread.messages;
    if (!prompt || !response) throw new Error("Fixture messages are missing");
    await repo.importGuestThread("owner", thread);
    await repo.importGuestThread("owner", thread);
    await repo.saveExchange("owner", "guest", prompt, {
      ...response,
      content: "edited",
    });
    await repo.importGuestThread("owner", thread);
    expect((await repo.getThread("owner", "guest"))?.messages[1]?.content).toBe(
      "edited",
    );
    await expect(
      repo.importGuestThread("owner", { ...thread, title: "different" }),
    ).rejects.toThrow();
    expect((await repo.getThread("owner", "guest"))?.title).toBe("hello");
  });

  it("keeps a guest import separate from an account's existing conversation", async () => {
    const db = environment.authenticatedContext("owner").firestore();
    const repo = new FirestoreChatRepository(db as unknown as Firestore);
    await repo.saveExchange(
      "owner",
      "existing",
      message("old-p", "user", 1, "existing prompt"),
      message("old-r", "assistant", 2, "existing reply"),
    );
    const guest = {
      id: "guest",
      title: "guest prompt",
      createdAt: 3,
      updatedAt: 4,
      messages: [
        message("guest-p", "user", 3, "guest prompt"),
        message("guest-r", "assistant", 4, "guest reply"),
      ],
    };

    await repo.importGuestThread("owner", guest);

    expect(await repo.listThreads("owner")).toHaveLength(2);
    expect(await repo.getThread("owner", "existing")).toEqual({
      id: "existing",
      title: "existing prompt",
      createdAt: 1,
      updatedAt: 2,
      messages: [
        message("old-p", "user", 1, "existing prompt"),
        message("old-r", "assistant", 2, "existing reply"),
      ],
    });
    expect(await repo.getThread("owner", "guest")).toEqual(guest);
  });

  it("appends an extended guest snapshot to an imported thread and rejects shared-ID conflicts", async () => {
    const db = environment.authenticatedContext("owner").firestore();
    const repo = new FirestoreChatRepository(db as unknown as Firestore);
    const original = {
      id: "guest",
      title: "hello",
      createdAt: 1,
      updatedAt: 2,
      messages: [
        message("p1", "user", 1, "hello"),
        message("r1", "assistant", 2, "hi"),
      ],
    };
    const extended = {
      ...original,
      updatedAt: 4,
      messages: [
        ...original.messages,
        message("p2", "user", 3, "second"),
        message("r2", "assistant", 4, "answer"),
      ],
    };
    await repo.importGuestThread("owner", original);

    await repo.importGuestThread("owner", extended);

    expect(await repo.getThread("owner", "guest")).toEqual(extended);
    await expect(
      repo.importGuestThread("owner", {
        ...extended,
        messages: extended.messages.map((item) =>
          item.id === "r1" ? { ...item, content: "conflict" } : item,
        ),
      }),
    ).rejects.toThrow();
    expect(await repo.getThread("owner", "guest")).toEqual(extended);
  });

  it("orders messages chronologically and lists metadata with deterministic ID ties", async () => {
    const db = environment.authenticatedContext("owner").firestore();
    const repo = new FirestoreChatRepository(db as unknown as Firestore);
    await setDoc(doc(db, "users", "owner", "threads", "z"), {
      id: "z",
      title: "z",
      createdAt: 1,
      updatedAt: 2,
    });
    await setDoc(doc(db, "users", "owner", "threads", "a"), {
      id: "a",
      title: "a",
      createdAt: 1,
      updatedAt: 2,
    });
    await setDoc(doc(db, "users", "owner", "threads", "current"), {
      id: "current",
      title: "legacy",
      createdAt: 1,
      updatedAt: 1,
    });
    await setDoc(
      doc(db, "users", "owner", "threads", "current", "messages", "late"),
      message("late", "assistant", 20),
    );
    await setDoc(
      doc(db, "users", "owner", "threads", "current", "messages", "early"),
      message("early", "user", 10),
    );

    expect((await repo.listThreads("owner")).map(({ id }) => id)).toEqual([
      "a",
      "z",
      "current",
    ]);
    expect(
      (await repo.getThread("owner", "current"))?.messages.map(({ id }) => id),
    ).toEqual(["early", "late"]);
  });

  it("rejects malformed stored messages and leaves no partial exchange on ID conflict", async () => {
    const db = environment.authenticatedContext("owner").firestore();
    const repo = new FirestoreChatRepository(db as unknown as Firestore);
    await environment.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "users", "owner", "threads", "bad"), {
        id: "bad",
        title: "bad",
        createdAt: 1,
        updatedAt: 1,
      });
      await setDoc(
        doc(adminDb, "users", "owner", "threads", "bad", "messages", "broken"),
        {
          id: "broken",
          role: "alien",
          content: 2,
          timestamp: "now",
          status: "bad",
        },
      );
    });
    await expect(repo.getThread("owner", "bad")).rejects.toThrow("malformed");
    await repo.saveExchange(
      "owner",
      "thread",
      message("prompt", "user", 1),
      message("response", "assistant", 2),
    );
    await expect(
      repo.saveExchange(
        "owner",
        "thread",
        message("prompt", "user", 1, "conflict"),
        message("response", "assistant", 2, "changed"),
      ),
    ).rejects.toThrow();
    expect(
      (
        await getDoc(
          doc(
            db,
            "users",
            "owner",
            "threads",
            "thread",
            "messages",
            "response",
          ),
        )
      ).data()?.content,
    ).toBe("response");
  });

  it("denies unauthenticated access and cross-user reads and writes while allowing owner operations", async () => {
    const ownerDb = environment.authenticatedContext("owner").firestore();
    const repo = new FirestoreChatRepository(ownerDb as unknown as Firestore);
    await repo.saveExchange(
      "owner",
      "private",
      message("p", "user", 1),
      message("r", "assistant", 2),
    );
    await expect(
      new FirestoreChatRepository(
        environment
          .unauthenticatedContext()
          .firestore() as unknown as Firestore,
      ).listThreads("owner"),
    ).rejects.toThrow();
    const otherDb = environment.authenticatedContext("other").firestore();
    await expect(
      getDoc(doc(otherDb, "users", "owner", "threads", "private")),
    ).rejects.toThrow();
    await expect(
      setDoc(doc(otherDb, "users", "owner", "threads", "private"), {
        title: "overwritten",
      }),
    ).rejects.toThrow();
    expect(await repo.getThread("owner", "private")).not.toBeNull();
  });

  it("rejects malformed records and unexpected credential fields at the rules boundary", async () => {
    const db = environment.authenticatedContext("owner").firestore();
    await expect(
      setDoc(doc(db, "users", "owner", "threads", "bad-thread"), {
        id: "bad-thread",
        title: "Bad",
        createdAt: 1,
        updatedAt: 2,
        apiKey: "must never be stored",
      }),
    ).rejects.toThrow();

    await setDoc(doc(db, "users", "owner", "threads", "valid"), {
      id: "valid",
      title: "Valid",
      createdAt: 1,
      updatedAt: 2,
    });
    await expect(
      setDoc(doc(db, "users", "owner", "threads", "valid", "messages", "bad"), {
        id: "bad",
        role: "system",
        content: "invalid role",
        timestamp: 1,
        status: "done",
      }),
    ).rejects.toThrow();
  });

  it("commits no part of a transaction when one message violates the rules", async () => {
    const db = environment.authenticatedContext("owner").firestore();
    const threadRef = doc(db, "users", "owner", "threads", "atomic");
    const promptRef = doc(
      db,
      "users",
      "owner",
      "threads",
      "atomic",
      "messages",
      "prompt",
    );
    const responseRef = doc(
      db,
      "users",
      "owner",
      "threads",
      "atomic",
      "messages",
      "response",
    );

    await expect(
      runTransaction(db, async (transaction) => {
        transaction.set(threadRef, {
          id: "atomic",
          title: "prompt",
          createdAt: 1,
          updatedAt: 2,
        });
        transaction.set(promptRef, message("prompt", "user", 1));
        transaction.set(responseRef, {
          ...message("response", "assistant", 2),
          apiKey: "must-not-persist",
        });
      }),
    ).rejects.toThrow();

    expect((await getDoc(threadRef)).exists()).toBe(false);
    expect((await getDoc(promptRef)).exists()).toBe(false);
    expect((await getDoc(responseRef)).exists()).toBe(false);
  });
});
