/**
 * Returns the number of set bits for every integer from 0 through n.
 * Time: O(n); space: O(n) for the result and O(1) auxiliary space.
 * @param n The inclusive upper bound (0 <= n <= 10,000).
 */
export default function bitCounting(n: number): number[] {
  const counts = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    const previousCount = counts[Math.floor(i / 2)];
    if (previousCount === undefined) {
      throw new Error("Missing previously computed bit count");
    }

    counts[i] = previousCount + (i & 1);
  }

  return counts;
}
