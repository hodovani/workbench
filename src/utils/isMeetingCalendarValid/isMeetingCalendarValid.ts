export type Interval = [number, number];

/**
 * Returns whether all meetings can be attended without overlap.
 * Sorts intervals in place by start time.
 */
export default function isMeetingCalendarValid(intervals: Interval[]): boolean {
  intervals.sort(([firstStart], [secondStart]) => firstStart - secondStart);

  let previousEnd: number | undefined;
  for (const [start, end] of intervals) {
    if (previousEnd !== undefined && previousEnd > start) return false;
    previousEnd = end;
  }

  return true;
}
