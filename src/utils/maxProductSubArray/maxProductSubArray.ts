/**
 * Returns the largest product of any contiguous, non-empty subarray.
 * Tracks both maximum and minimum products ending at each position.
 * Time: O(n); space: O(1).
 * @param numbers A non-empty array of integers.
 */
export default function maxProductSubArray(numbers: number[]): number {
  let maxEndingHere = 1;
  let minEndingHere = 1;
  let maxProduct = Number.NEGATIVE_INFINITY;

  for (const number of numbers) {
    const previousMax = maxEndingHere;
    const previousMin = minEndingHere;

    maxEndingHere = Math.max(
      number,
      number * previousMax,
      number * previousMin,
    );
    minEndingHere = Math.min(
      number,
      number * previousMax,
      number * previousMin,
    );
    maxProduct = Math.max(maxProduct, maxEndingHere);
  }

  return maxProduct;
}
