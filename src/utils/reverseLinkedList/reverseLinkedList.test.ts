import { describe, expect, it } from "vitest";
import reverseLinkedList, { type ListNode } from "./reverseLinkedList";

const makeList = (values: number[]): ListNode | null =>
  values.reduceRight<ListNode | null>((next, val) => ({ val, next }), null);

describe("reverseLinkedList", () => {
  it("returns null for an empty list", () => {
    expect(reverseLinkedList(null)).toBeNull();
  });

  it("returns the same node for a single-node list", () => {
    const head: ListNode = { val: -1_000, next: null };

    expect(reverseLinkedList(head)).toBe(head);
    expect(head.next).toBeNull();
  });

  it("reverses links in place and returns the original tail", () => {
    const first: ListNode = { val: 1, next: null };
    const second: ListNode = { val: 2, next: null };
    const third: ListNode = { val: 3, next: null };
    first.next = second;
    second.next = third;

    expect(reverseLinkedList(first)).toBe(third);
    expect(third.next).toBe(second);
    expect(second.next).toBe(first);
    expect(first.next).toBeNull();
  });

  it("handles the maximum list size and value boundaries", () => {
    const values = Array.from({ length: 1_000 }, (_, index) => index - 500);
    values[0] = -1_000;
    values[999] = 1_000;
    let current = reverseLinkedList(makeList(values));
    const reversedValues: number[] = [];

    for (let i = 0; i <= values.length && current !== null; i++) {
      reversedValues.push(current.val);
      current = current.next;
    }

    expect(reversedValues).toEqual([...values].reverse());
    expect(current).toBeNull();
  });
});
