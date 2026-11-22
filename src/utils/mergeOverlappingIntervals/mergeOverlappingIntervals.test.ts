import { describe, expect, it } from "vitest";
import mergeOverlappingIntervals, {
  type Interval,
} from "./mergeOverlappingIntervals";

const cases: [string, Interval[], Interval[]][] = [
  ["a single interval", [[83, 99]], [[83, 99]]],
  [
    "non-overlapping intervals",
    [
      [83, 99],
      [100, 110],
    ],
    [
      [83, 99],
      [100, 110],
    ],
  ],
  [
    "intervals sharing an endpoint",
    [
      [1, 3],
      [3, 5],
    ],
    [[1, 5]],
  ],
  [
    "nested and chained overlaps",
    [
      [1, 5],
      [2, 4],
      [4, 6],
      [7, 8],
    ],
    [
      [1, 6],
      [7, 8],
    ],
  ],
  [
    "unsorted intervals with the same start",
    [
      [4, 8],
      [1, 3],
      [1, 2],
    ],
    [
      [1, 3],
      [4, 8],
    ],
  ],
  [
    "duplicate zero-length intervals",
    [
      [5, 5],
      [5, 5],
    ],
    [[5, 5]],
  ],
  [
    "intervals at the allowed value boundaries",
    [
      [10_000, 10_000],
      [0, 0],
      [0, 10_000],
    ],
    [[0, 10_000]],
  ],
];

describe("mergeOverlappingIntervals", () => {
  it.each(cases)("merges %s", (_scenario, intervals, expected) => {
    expect(mergeOverlappingIntervals(intervals)).toEqual(expected);
  });

  it("does not mutate the input intervals", () => {
    const intervals: Interval[] = [
      [2, 4],
      [1, 3],
    ];
    const original = structuredClone(intervals);

    mergeOverlappingIntervals(intervals);

    expect(intervals).toEqual(original);
  });

  it("handles the maximum number of intervals", () => {
    const intervals = Array.from(
      { length: 100 },
      (_, index): Interval => [index * 2, index * 2 + 1],
    );

    expect(mergeOverlappingIntervals(intervals)).toEqual(intervals);
  });
});
