import { describe, expect, it } from "vitest";
import binaryTreeMaximumDepth, {
  binaryTreeMaximumDepthIterative,
  type TreeNode,
} from "./binaryTreeMaximumDepth";

const makeLeaf = (val: number): TreeNode => ({ val, left: null, right: null });

const solutions = [
  ["recursive", binaryTreeMaximumDepth],
  ["iterative", binaryTreeMaximumDepthIterative],
] as const;

describe.each(solutions)("binaryTreeMaximumDepth (%s)", (_name, maxDepth) => {
  it("returns zero for an empty tree", () => {
    expect(maxDepth(null)).toBe(0);
  });

  it("counts a leaf as one node", () => {
    expect(maxDepth(makeLeaf(-100))).toBe(1);
  });

  it("counts a one-sided path", () => {
    const root: TreeNode = {
      val: 1,
      left: null,
      right: { val: 2, left: null, right: makeLeaf(3) },
    };

    expect(maxDepth(root)).toBe(3);
  });

  it("uses the deeper of two uneven branches", () => {
    const root: TreeNode = {
      val: 1,
      left: { val: 2, left: makeLeaf(4), right: null },
      right: makeLeaf(3),
    };

    expect(maxDepth(root)).toBe(3);
  });

  it("handles the maximum node count", () => {
    const nodes = Array.from({ length: 10_000 }, (_, val) => makeLeaf(val));
    nodes.forEach((node, i) => {
      node.left = nodes[2 * i + 1] ?? null;
      node.right = nodes[2 * i + 2] ?? null;
    });

    expect(maxDepth(nodes[0] ?? null)).toBe(14);
  });
});

it("iteratively handles a maximally skewed 10,000-node tree", () => {
  const root = makeLeaf(0);
  let node = root;
  for (let i = 1; i < 10_000; i++) {
    node.right = makeLeaf(i);
    node = node.right;
  }

  expect(binaryTreeMaximumDepth(root)).toBe(10_000);
});
