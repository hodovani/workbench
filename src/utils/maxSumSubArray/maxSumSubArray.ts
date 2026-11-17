/**
 * Returns the largest sum of any contiguous, non-empty subarray.
 * Time: O(n); space: O(1).
 * @param numbers A non-empty array of integers.
 */
export default function maxSumSubArray(numbers: number[]): number {
  let bestEndingHere = 0;
  let bestOverall = Number.NEGATIVE_INFINITY;

  for (const number of numbers) {
    bestEndingHere = Math.max(number, bestEndingHere + number);
    bestOverall = Math.max(bestOverall, bestEndingHere);
  }

  return bestOverall;
}
