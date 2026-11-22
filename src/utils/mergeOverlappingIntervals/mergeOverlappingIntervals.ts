export type Interval = [number, number];

/**
 * Merges overlapping intervals, including intervals that share an endpoint.
 * Time: O(n log n); space: O(n).
 * The input intervals are not modified.
 * @param intervals The intervals to merge.
 */
export default function mergeOverlappingIntervals(
  intervals: Interval[],
): Interval[] {
  const sortedIntervals = intervals.toSorted(
    ([firstStart], [secondStart]) => firstStart - secondStart,
  );
  const merged: Interval[] = [];

  for (const [start, end] of sortedIntervals) {
    const previous = merged.at(-1);

    if (previous === undefined || start > previous[1]) {
      merged.push([start, end]);
      continue;
    }

    previous[1] = Math.max(previous[1], end);
  }

  return merged;
}
