import { describe, expect, it } from "vitest";
import linkedListDeleteNthNodeFromEnd, {
  type ListNode,
} from "./linkedListDeleteNthNodeFromEnd";

const makeList = (values: number[]): ListNode | null =>
  values.reduceRight<ListNode | null>((next, val) => ({ val, next }), null);

const listValues = (head: ListNode | null): number[] => {
  const values: number[] = [];

  while (head !== null) {
    values.push(head.val);
    head = head.next;
  }

  return values;
};

describe("linkedListDeleteNthNodeFromEnd", () => {
  it("deletes a middle node", () => {
    const head = makeList([1, 2, 3, 4, 5, 6]);

    expect(listValues(linkedListDeleteNthNodeFromEnd(head, 3))).toEqual([
      1, 2, 3, 5, 6,
    ]);
  });

  it("deletes the only node", () => {
    expect(
      listValues(linkedListDeleteNthNodeFromEnd(makeList([8]), 1)),
    ).toEqual([]);
  });

  it("deletes the tail when n is one", () => {
    expect(
      listValues(linkedListDeleteNthNodeFromEnd(makeList([9, 7]), 1)),
    ).toEqual([9]);
  });

  it("deletes the head when n is the list length", () => {
    expect(
      listValues(linkedListDeleteNthNodeFromEnd(makeList([1, 2, 3]), 3)),
    ).toEqual([2, 3]);
  });

  it("handles the maximum list size", () => {
    const values = Array.from({ length: 1_000 }, (_, index) => index + 1);
    const result = linkedListDeleteNthNodeFromEnd(makeList(values), 500);

    expect(listValues(result)).toEqual([
      ...values.slice(0, 500),
      ...values.slice(501),
    ]);
  });
});
