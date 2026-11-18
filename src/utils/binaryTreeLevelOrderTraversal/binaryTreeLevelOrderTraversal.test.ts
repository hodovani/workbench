import { describe, expect, it } from "vitest";
import binaryTreeLevelOrderTraversal, {
  type TreeNode,
} from "./binaryTreeLevelOrderTraversal";

const makeLeaf = (val: number): TreeNode => ({ val, left: null, right: null });

const makeCompleteTree = (values: number[]): TreeNode | null => {
  const nodes = values.map(makeLeaf);
  nodes.forEach((node, index) => {
    node.left = nodes[2 * index + 1] ?? null;
    node.right = nodes[2 * index + 2] ?? null;
  });
  return nodes[0] ?? null;
};

describe("binaryTreeLevelOrderTraversal", () => {
  it("returns no levels for an empty tree", () => {
    expect(binaryTreeLevelOrderTraversal(null)).toEqual([]);
  });

  it("returns one level for a single node", () => {
    expect(binaryTreeLevelOrderTraversal(makeLeaf(-100))).toEqual([[-100]]);
  });

  it("includes a right child when the left child is missing", () => {
    expect(
      binaryTreeLevelOrderTraversal({
        val: 13,
        left: null,
        right: makeLeaf(-55),
      }),
    ).toEqual([[13], [-55]]);
  });

  it("returns values left to right at each level", () => {
    expect(
      binaryTreeLevelOrderTraversal(makeCompleteTree([1, 2, 3, 4, 5, 6, 7])),
    ).toEqual([[1], [2, 3], [4, 5, 6, 7]]);
  });

  it("handles gaps in a sparse tree", () => {
    const root: TreeNode = {
      val: 5,
      left: { val: 3, left: null, right: makeLeaf(4) },
      right: { val: 8, left: makeLeaf(7), right: makeLeaf(9) },
    };

    expect(binaryTreeLevelOrderTraversal(root)).toEqual([
      [5],
      [3, 8],
      [4, 7, 9],
    ]);
  });

  it("handles the maximum number of nodes", () => {
    const values = Array.from(
      { length: 10_000 },
      (_, index) => (index % 201) - 100,
    );
    const levels = binaryTreeLevelOrderTraversal(makeCompleteTree(values));

    expect(levels.flat()).toEqual(values);
    expect(levels).toHaveLength(14);
  });
});
