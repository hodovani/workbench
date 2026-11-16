export interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

// Time: O(n). Space: O(h) for the recursion stack.
export default function binaryTreeMaximumDepth(root: TreeNode | null): number {
  if (root === null) return 0;

  return (
    1 +
    Math.max(
      binaryTreeMaximumDepth(root.left),
      binaryTreeMaximumDepth(root.right),
    )
  );
}

// Time: O(n). Space: O(h) for the explicit depth-first stack.
export function binaryTreeMaximumDepthIterative(root: TreeNode | null): number {
  if (root === null) return 0;

  const stack: Array<[TreeNode, number]> = [[root, 1]];
  let maxDepth = 0;

  while (stack.length > 0) {
    const entry = stack.pop();
    if (entry === undefined) continue;

    const [node, depth] = entry;
    maxDepth = Math.max(maxDepth, depth);

    if (node.left) stack.push([node.left, depth + 1]);
    if (node.right) stack.push([node.right, depth + 1]);
  }

  return maxDepth;
}
