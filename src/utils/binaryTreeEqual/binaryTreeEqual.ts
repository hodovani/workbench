export interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

/**
 * Checks whether two binary trees have the same structure and node values.
 *
 * @param a - Root of the first tree.
 * @param b - Root of the second tree.
 * @returns Whether the trees are equal.
 * @complexity Time O(min(nA, nB)); space O(min(hA, hB)) for the call stack.
 */
export default function binaryTreeEqual(
  a: TreeNode | null,
  b: TreeNode | null,
): boolean {
  if (a === null || b === null) return a === b;
  if (a.val !== b.val) return false;

  return binaryTreeEqual(a.left, b.left) && binaryTreeEqual(a.right, b.right);
}

/**
 * Checks whether two binary trees have the same structure and node values,
 * comparing corresponding nodes level by level.
 *
 * @param a - Root of the first tree.
 * @param b - Root of the second tree.
 * @returns Whether the trees are equal.
 * @complexity Time O(min(nA, nB)); space O(w) for the widest level of pairs.
 */
export function binaryTreeEqualIterative(
  a: TreeNode | null,
  b: TreeNode | null,
): boolean {
  let level: Array<[TreeNode | null, TreeNode | null]> = [[a, b]];

  while (level.length > 0) {
    const next: Array<[TreeNode | null, TreeNode | null]> = [];

    for (const [left, right] of level) {
      if (left === null || right === null) {
        if (left !== right) return false;
        continue;
      }

      if (left.val !== right.val) return false;

      next.push([left.left, right.left], [left.right, right.right]);
    }

    level = next;
  }

  return true;
}
