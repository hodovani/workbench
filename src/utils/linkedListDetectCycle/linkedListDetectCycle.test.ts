import { describe, expect, it } from "vitest";
import linkedListDetectCycle, { type ListNode } from "./linkedListDetectCycle";

describe("linkedListDetectCycle", () => {
  it("returns false for an empty list", () => {
    expect(linkedListDetectCycle(null)).toBe(false);
  });

  it("returns false for a single node that ends at null", () => {
    expect(linkedListDetectCycle({ val: 1, next: null })).toBe(false);
  });

  it("detects a self-cycle", () => {
    const node: ListNode = { val: 1, next: null };
    node.next = node;

    expect(linkedListDetectCycle(node)).toBe(true);
  });

  it("detects a cycle back to the head", () => {
    const first: ListNode = { val: 1, next: null };
    const second: ListNode = { val: 2, next: null };
    const third: ListNode = { val: 3, next: first };
    first.next = second;
    second.next = third;

    expect(linkedListDetectCycle(first)).toBe(true);
  });

  it("detects a cycle that begins in the middle", () => {
    const first: ListNode = { val: 3, next: null };
    const second: ListNode = { val: 2, next: null };
    const third: ListNode = { val: 0, next: null };
    const fourth: ListNode = { val: -4, next: second };
    first.next = second;
    second.next = third;
    third.next = fourth;

    expect(linkedListDetectCycle(first)).toBe(true);
  });

  it("does not mistake repeated values for a cycle", () => {
    const head: ListNode = {
      val: 1,
      next: { val: 2, next: { val: 1, next: null } },
    };

    expect(linkedListDetectCycle(head)).toBe(false);
  });

  it("handles the maximum list size without a cycle", () => {
    const head = Array.from(
      { length: 1_000 },
      (_, index) => index,
    ).reduceRight<ListNode | null>((next, val) => ({ val, next }), null);

    expect(linkedListDetectCycle(head)).toBe(false);
  });
});
