import { describe, expect, it } from "vitest";
import binaryTreeEqual, {
  binaryTreeEqualIterative,
  type TreeNode,
} from "./binaryTreeEqual";

const makeLeaf = (val: number): TreeNode => ({ val, left: null, right: null });

const solutions = [
  ["recursive", binaryTreeEqual],
  ["iterative", binaryTreeEqualIterative],
] as const;

describe.each(solutions)("binaryTreeEqual (%s)", (_name, equal) => {
  it("considers two empty trees equal", () => {
    expect(equal(null, null)).toBe(true);
  });

  it("considers an empty and a non-empty tree different", () => {
    expect(equal(null, makeLeaf(1))).toBe(false);
  });

  it("compares node values and structure", () => {
    const a: TreeNode = {
      val: 1,
      left: makeLeaf(2),
      right: makeLeaf(3),
    };
    const equalTree: TreeNode = {
      val: 1,
      left: makeLeaf(2),
      right: makeLeaf(3),
    };
    const differentStructure: TreeNode = {
      val: 1,
      left: null,
      right: { val: 2, left: null, right: makeLeaf(3) },
    };

    expect(equal(a, equalTree)).toBe(true);
    expect(equal(a, differentStructure)).toBe(false);
    expect(equal(a, { ...equalTree, val: -1 })).toBe(false);
  });

  it("supports the value limits and maximum node count", () => {
    const a = makeLeaf(-10_000);
    const b = makeLeaf(-10_000);
    let left = a;
    let right = b;

    for (let i = 1; i < 100; i++) {
      const val = 9_900 + i;
      left.right = makeLeaf(val);
      right.right = makeLeaf(val);
      left = left.right;
      right = right.right;
    }

    expect(equal(a, b)).toBe(true);
    right.val = 0;
    expect(equal(a, b)).toBe(false);
  });
});
