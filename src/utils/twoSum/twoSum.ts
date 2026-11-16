/**
 * Returns the indices of the two numbers that sum to the target.
 * Time Complexity: O(n), where n is the length of the input array.
 * Space Complexity: O(n).
 * @param numbers The input array of integers.
 * @param target The required sum.
 * @returns The two matching indices in ascending order.
 * @example
 * twoSum([0, 7, 1, 9], 7) // [0, 1]
 */
export default function twoSum(
  numbers: readonly number[],
  target: number,
): number[] {
  const seen = new Map<number, number>();

  for (const [index, number] of numbers.entries()) {
    const complementIndex = seen.get(target - number);
    if (complementIndex !== undefined) return [complementIndex, index];

    seen.set(number, index);
  }

  return [];
}
