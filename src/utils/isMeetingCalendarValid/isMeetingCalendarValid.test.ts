import { describe, expect, it } from "vitest";
import isMeetingCalendarValid, {
  type Interval,
} from "./isMeetingCalendarValid";

const cases: [string, Interval[], boolean][] = [
  ["no meetings", [], true],
  ["one meeting", [[83, 99]], true],
  [
    "back-to-back meetings",
    [
      [1, 5],
      [5, 10],
      [10, 15],
    ],
    true,
  ],
  [
    "unsorted back-to-back meetings",
    [
      [10, 15],
      [1, 5],
      [5, 10],
    ],
    true,
  ],
  [
    "overlapping meetings",
    [
      [8, 10],
      [1, 3],
      [2, 6],
      [15, 18],
    ],
    false,
  ],
  [
    "one meeting nested inside another",
    [
      [1, 10],
      [3, 4],
    ],
    false,
  ],
  [
    "meetings with the same start time",
    [
      [1, 4],
      [1, 3],
    ],
    false,
  ],
];

describe("isMeetingCalendarValid", () => {
  it.each(cases)("returns %s", (_scenario, intervals, expected) => {
    expect(isMeetingCalendarValid(intervals)).toBe(expected);
  });

  it("handles the maximum number of non-overlapping meetings", () => {
    const intervals = Array.from(
      { length: 1_000 },
      (_, index): Interval => [index * 2, index * 2 + 1],
    );

    expect(isMeetingCalendarValid(intervals)).toBe(true);
  });
});
