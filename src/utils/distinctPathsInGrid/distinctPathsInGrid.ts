/**
 * Counts paths from the top-left to the bottom-right, moving only right or down.
 * Time: O(m * n); space: O(min(m, n)).
 * @param m The number of grid rows.
 * @param n The number of grid columns.
 */
export default function distinctPathsInGrid(m: number, n: number): number {
  const pathCounts = Array<number>(Math.min(m, n)).fill(1);

  for (let row = 1; row < Math.max(m, n); row++) {
    for (let column = 1; column < pathCounts.length; column++) {
      pathCounts[column] =
        (pathCounts[column] ?? 0) + (pathCounts[column - 1] ?? 0);
    }
  }

  return pathCounts.at(-1) ?? 0;
}
