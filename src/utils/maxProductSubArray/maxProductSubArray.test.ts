import { describe, expect, it } from "vitest";
import maxProductSubArray from "./maxProductSubArray";

const cases: [string, number[], number][] = [
  ["the first example", [1, 2, -3, 5, 1], 5],
  ["a single positive value", [9], 9],
  ["a single negative value", [-9], -9],
  ["the example with two negative values", [1, 2, 0, -1, 8, -4], 32],
  ["a negative product becoming positive", [-2, 3, -4], 24],
  ["an all-negative array", [-2, -3, -4], 12],
  ["zeros separating products", [2, 3, 0, -2, 4, -1], 8],
  ["multiple zeros and negative values", [0, -2, 0, -3], 0],
];

describe("maxProductSubArray", () => {
  it.each(
    cases,
  )("returns the maximum contiguous product for %s", (_scenario, numbers, expected) => {
    expect(maxProductSubArray(numbers)).toBe(expected);
  });

  it("handles the maximum input length", () => {
    expect(maxProductSubArray(Array<number>(1_000).fill(-1))).toBe(1);
  });
});
