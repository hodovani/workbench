import { describe, expect, it } from "vitest";
import linkedListCombineTwoSorted, {
  type ListNode,
} from "./linkedListCombineTwoSorted";

const makeList = (values: number[]): ListNode | null =>
  values.reduceRight<ListNode | null>((next, val) => ({ val, next }), null);

const listValues = (head: ListNode | null): number[] => {
  const values: number[] = [];
  let current = head;

  while (current !== null && values.length < 101) {
    values.push(current.val);
    current = current.next;
  }

  return values;
};

describe("linkedListCombineTwoSorted", () => {
  it("returns null when both lists are empty", () => {
    expect(linkedListCombineTwoSorted(null, null)).toBeNull();
  });

  it("returns the non-empty list when the first list is empty", () => {
    const listB = makeList([0]);

    expect(linkedListCombineTwoSorted(null, listB)).toBe(listB);
  });

  it("returns the non-empty list when the second list is empty", () => {
    const listA = makeList([-1, 2]);

    expect(linkedListCombineTwoSorted(listA, null)).toBe(listA);
  });

  it.each([
    [
      [-3, -1, 9, 10],
      [-10, 3, 4, 6, 9],
      [-10, -3, -1, 3, 4, 6, 9, 9, 10],
    ],
    [
      [1, 2, 4],
      [1, 3, 4],
      [1, 1, 2, 3, 4, 4],
    ],
    [
      [-100, 0, 5],
      [-100, -1, 5, 100],
      [-100, -100, -1, 0, 5, 5, 100],
    ],
  ] as const)("merges sorted lists in ascending order", (valuesA, valuesB, expected) => {
    expect(
      listValues(
        linkedListCombineTwoSorted(
          makeList([...valuesA]),
          makeList([...valuesB]),
        ),
      ),
    ).toEqual(expected);
  });

  it("handles 50 nodes in each list", () => {
    const valuesA = Array.from({ length: 50 }, (_, index) => -100 + index * 2);
    const valuesB = Array.from({ length: 50 }, (_, index) => -99 + index * 2);
    const expected = Array.from({ length: 100 }, (_, index) => index - 100);

    expect(
      listValues(
        linkedListCombineTwoSorted(makeList(valuesA), makeList(valuesB)),
      ),
    ).toEqual(expected);
  });
});
