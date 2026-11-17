import { describe, expect, it } from "vitest";
import type { TreeNode } from "../binaryTreeEqual/binaryTreeEqual";
import binaryTreeSubtree from "./binaryTreeSubtree";

const makeNode = (
  val: number,
  left: TreeNode | null = null,
  right: TreeNode | null = null,
): TreeNode => ({ val, left, right });

const makeRightChain = (values: number[]): TreeNode | null =>
  values.reduceRight<TreeNode | null>(
    (right, val) => makeNode(val, null, right),
    null,
  );

describe("binaryTreeSubtree", () => {
  it("finds a matching subtree", () => {
    const root = makeNode(
      12,
      makeNode(8, makeNode(3), makeNode(5)),
      makeNode(6),
    );
    const subRoot = makeNode(8, makeNode(3), makeNode(5));

    expect(binaryTreeSubtree(root, subRoot)).toBe(true);
  });

  it("requires the candidate subtree to match in structure", () => {
    const root = makeNode(1, makeNode(2), makeNode(3));
    const subRoot = makeNode(1, makeNode(2));

    expect(binaryTreeSubtree(root, subRoot)).toBe(false);
  });

  it("continues searching after a same-value candidate fails", () => {
    const root = makeNode(
      0,
      makeNode(4, makeNode(8)),
      makeNode(4, null, makeNode(8)),
    );
    const subRoot = makeNode(4, null, makeNode(8));

    expect(binaryTreeSubtree(root, subRoot)).toBe(true);
  });

  it("considers a tree to be a subtree of itself", () => {
    const root = makeNode(1, makeNode(-2), makeNode(3));

    expect(binaryTreeSubtree(root, root)).toBe(true);
  });

  it("treats an empty subtree as contained and an empty root as containing no non-empty tree", () => {
    expect(binaryTreeSubtree(null, null)).toBe(true);
    expect(binaryTreeSubtree(makeNode(1), null)).toBe(true);
    expect(binaryTreeSubtree(null, makeNode(1))).toBe(false);
  });

  it("handles the maximum node count and value boundaries", () => {
    const values = Array.from({ length: 100 }, (_, index) => index);
    values[0] = -10_000;
    values[99] = 10_000;

    expect(binaryTreeSubtree(makeRightChain(values), makeNode(10_000))).toBe(
      true,
    );
  });
});
