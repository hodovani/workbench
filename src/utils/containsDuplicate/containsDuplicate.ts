/**
 * Checks whether an array contains any repeated number.
 * Time Complexity: O(n), where n is the length of the input array.
 * Space Complexity: O(n), where n is the length of the input array.
 * Reference: https://www.greatfrontend.com/interviews/study/blind75/questions/algo/array-contains-duplicate
 * Reference: https://leetcode.com/problems/contains-duplicate/
 * @param numbers The input array of numbers to check.
 * @returns True if the array contains any repeated number, false otherwise.
 * @example
 * containsDuplicate([1, 2, 3, 4]) // false
 * containsDuplicate([1, 2, 3, 1]) // true
 */
export default function containsDuplicate(numbers: readonly number[]): boolean {
  const seen = new Set<number>();

  for (const number of numbers) {
    if (seen.has(number)) return true;
    seen.add(number);
  }

  return false;
}
