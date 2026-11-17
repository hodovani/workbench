import { describe, expect, it } from "vitest";
import maxSumSubArray from "./maxSumSubArray";

const cases: [string, number[], number][] = [
  ["the mixed-sign example", [-1, 5, -3, 9, -11], 11],
  ["a single positive value", [9], 9],
  ["a single negative value", [-9], -9],
  ["an all-negative array", [-10_000, -1, -10_000], -1],
  ["an all-positive array", [1, 2, 3, 4], 10],
  ["a best subarray at the start", [5, -1, -2], 5],
  ["a best subarray at the end", [-2, -1, 5], 5],
  ["zeros with negative values", [0, 0, -1, 0], 0],
];

describe("maxSumSubArray", () => {
  it.each(
    cases,
  )("returns the maximum contiguous sum for %s", (_scenario, numbers, expected) => {
    expect(maxSumSubArray(numbers)).toBe(expected);
  });

  it("handles the maximum input length and value", () => {
    const numbers = Array<number>(10_000).fill(10_000);

    expect(maxSumSubArray(numbers)).toBe(100_000_000);
  });
});
