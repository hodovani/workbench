import { describe, expect, it } from "vitest";
import mostCommonElements from "./mostCommonElements";

const cases: [string, number[], number, number[]][] = [
  ["the first example", [4, 4, 4, 6, 6, 5, 5, 5], 2, [4, 5]],
  [
    "all unique results when k equals three",
    [7, 7, 7, 8, 8, 9, 9, 9],
    3,
    [7, 8, 9],
  ],
  ["one unique number", [10, 10, 10, 10, 10], 1, [10]],
  ["negative values", [-1, -1, -2, -2, -2, 0], 2, [-2, -1]],
  ["k equal to the number of unique values", [3, -2, 7], 3, [-2, 3, 7]],
];

describe("mostCommonElements", () => {
  it.each(
    cases,
  )("returns the k most frequent values for %s", (_scenario, numbers, k, expected) => {
    expect(mostCommonElements(numbers, k).sort((a, b) => a - b)).toEqual(
      expected.sort((a, b) => a - b),
    );
  });

  it("handles the maximum input size", () => {
    const numbers = Array.from({ length: 1_000 }, (_, index) => index % 100);
    const expected = Array.from({ length: 100 }, (_, index) => index);

    expect(mostCommonElements(numbers, 100).sort((a, b) => a - b)).toEqual(
      expected,
    );
  });
});
