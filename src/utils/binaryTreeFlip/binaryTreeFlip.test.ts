import { describe, expect, it } from "vitest";
import binaryTreeFlip, {
  binaryTreeFlipIterative,
  type TreeNode,
} from "./binaryTreeFlip";

const makeLeaf = (val: number): TreeNode => ({ val, left: null, right: null });

const solutions = [
  ["recursive", binaryTreeFlip],
  ["iterative", binaryTreeFlipIterative],
] as const;

describe.each(solutions)("binaryTreeFlip (%s)", (_name, flip) => {
  it("swaps every node's children and returns the original root", () => {
    const root: TreeNode = {
      val: 12,
      left: { val: 8, left: makeLeaf(6), right: null },
      right: { val: 18, left: null, right: makeLeaf(20) },
    };

    expect(flip(root)).toBe(root);
    expect(root).toEqual({
      val: 12,
      left: { val: 18, left: makeLeaf(20), right: null },
      right: { val: 8, left: null, right: makeLeaf(6) },
    });
  });

  it("moves a right-only child to the left", () => {
    const root: TreeNode = { val: 43, left: null, right: makeLeaf(-55) };

    expect(flip(root)).toBe(root);
    expect(root).toEqual({ val: 43, left: makeLeaf(-55), right: null });
  });

  it("returns null for an empty tree", () => {
    expect(flip(null)).toBeNull();
  });

  it("handles the maximum node count", () => {
    const root = makeLeaf(0);
    let node = root;
    for (let i = 1; i < 100; i++) {
      node.left = makeLeaf(i);
      node = node.left;
    }

    expect(flip(root)).toBe(root);
    expect(root.right?.val).toBe(1);
    expect(root.right?.right?.val).toBe(2);
  });
});
