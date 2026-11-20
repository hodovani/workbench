import { describe, expect, it } from "vitest";
import Queue from "./queue";

describe("Queue", () => {
  it("starts empty and updates its size as items are removed", () => {
    const queue = new Queue<number>();

    expect(queue.size).toBe(0);
    queue.enqueue(1);
    expect(queue.size).toBe(1);
    expect(queue.dequeue()).toBe(1);
    expect(queue.size).toBe(0);
  });

  it("returns values in FIFO order after interleaved operations", () => {
    const queue = new Queue<number>();
    queue.enqueue(1);
    queue.enqueue(2);

    expect(queue.dequeue()).toBe(1);
    queue.enqueue(3);

    expect(queue.dequeue()).toBe(2);
    expect(queue.dequeue()).toBe(3);
  });

  it("throws when dequeuing an empty queue", () => {
    expect(() => new Queue<number>().dequeue()).toThrow("Queue is empty");
  });
});
