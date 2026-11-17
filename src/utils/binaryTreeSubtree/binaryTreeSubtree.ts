import binaryTreeEqual, {
  type TreeNode,
} from "../binaryTreeEqual/binaryTreeEqual";

/**
 * Checks whether subRoot matches any subtree of root.
 * Time: O(n * m); space: O(hRoot + hSubRoot) for recursive calls.
 * @param root The tree to search.
 * @param subRoot The subtree to find.
 * @returns Whether subRoot occurs in root.
 */
export default function binaryTreeSubtree(
  root: TreeNode | null,
  subRoot: TreeNode | null,
): boolean {
  if (subRoot === null) return true;
  if (root === null) return false;

  return (
    binaryTreeEqual(root, subRoot) ||
    binaryTreeSubtree(root.left, subRoot) ||
    binaryTreeSubtree(root.right, subRoot)
  );
}
