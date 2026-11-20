interface QueueNode<T> {
  value: T;
  next: QueueNode<T> | null;
}

/** FIFO queue with O(1) enqueue and dequeue. */
export default class Queue<T> {
  private first: QueueNode<T> | null = null;
  private last: QueueNode<T> | null = null;
  private itemCount = 0;

  get size(): number {
    return this.itemCount;
  }

  enqueue(value: T): void {
    const node: QueueNode<T> = { value, next: null };

    if (this.last === null) {
      this.first = node;
    } else {
      this.last.next = node;
    }

    this.last = node;
    this.itemCount++;
  }

  /** Removes the oldest item, or throws if the queue is empty. */
  dequeue(): T {
    if (this.first === null) throw new Error("Queue is empty");

    const { value, next } = this.first;
    this.first = next;
    if (next === null) this.last = null;
    this.itemCount--;

    return value;
  }
}
