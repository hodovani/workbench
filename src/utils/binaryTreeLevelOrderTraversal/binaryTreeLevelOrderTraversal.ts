export interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

/**
 * Returns the node values grouped by level from left to right.
 * Time: O(n); queue space: O(w), where w is the maximum tree width.
 * The returned levels use O(n) space.
 * @param root The root of the tree, or null for an empty tree.
 */
export default function binaryTreeLevelOrderTraversal(
  root: TreeNode | null,
): number[][] {
  if (root === null) return [];

  const levels: number[][] = [];
  let currentLevel = [root];

  while (currentLevel.length > 0) {
    const values: number[] = [];
    const nextLevel: TreeNode[] = [];

    for (const node of currentLevel) {
      values.push(node.val);
      if (node.left !== null) nextLevel.push(node.left);
      if (node.right !== null) nextLevel.push(node.right);
    }

    levels.push(values);
    currentLevel = nextLevel;
  }

  return levels;
}
