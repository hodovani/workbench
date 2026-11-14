/**
 * Finds the missing integer from the range [0, numbers.length].
 * Time Complexity: O(n), where n is the length of the input array.
 * Space Complexity: O(1).
 * @param numbers The input array containing distinct integers in [0, numbers.length].
 * @returns The integer missing from the range.
 * @example
 * missingNumber([1, 3, 0]) // 2
 * missingNumber([3, 0, 4, 2, 1]) // 5
 * Reference: https://www.greatfrontend.com/interviews/study/blind75/questions/algo/missing-number
 * Reference: https://leetcode.com/problems/missing-number/
 */
export default function missingNumber(numbers: readonly number[]): number {
  const expectedSum = (numbers.length * (numbers.length + 1)) / 2;
  const actualSum = numbers.reduce((sum, number) => sum + number, 0);

  return expectedSum - actualSum;
}
