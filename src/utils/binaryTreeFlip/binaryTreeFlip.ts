export interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

// Time: O(n). Space: O(h) for the recursion stack.
export default function binaryTreeFlip(root: TreeNode | null): TreeNode | null {
  if (root === null) return null;

  const left = binaryTreeFlip(root.left);
  root.left = binaryTreeFlip(root.right);
  root.right = left;
  return root;
}

// Time: O(n). Space: O(w), where w is the maximum width of the tree.
export function binaryTreeFlipIterative(
  root: TreeNode | null,
): TreeNode | null {
  if (root === null) return null;

  let level = [root];
  while (level.length > 0) {
    const nextLevel: TreeNode[] = [];
    for (const node of level) {
      [node.left, node.right] = [node.right, node.left];
      if (node.left) nextLevel.push(node.left);
      if (node.right) nextLevel.push(node.right);
    }
    level = nextLevel;
  }

  return root;
}
