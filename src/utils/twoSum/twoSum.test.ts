import { describe, expect, it } from "vitest";
import twoSum from "./twoSum";

describe("twoSum", () => {
  it.each([
    ["the first pair", [0, 7, 1, 9], 7, [0, 1]],
    ["a later pair, in index order", [4, 9, 2, 1, 7], 5, [0, 3]],
    ["two equal values", [4, 4], 8, [0, 1]],
    ["a pair containing negative values", [-2, 5, -7, 3], 3, [0, 1]],
    ["values at the input boundaries", [-2_000, 2_000], 0, [0, 1]],
  ] as const)("returns the expected indices for %s", (_scenario, numbers, target, expected) => {
    expect(twoSum(numbers, target)).toEqual(expected);
  });

  it("does not use the same element twice", () => {
    expect(twoSum([3, 4, 2], 6)).toEqual([1, 2]);
  });

  it("handles the maximum input size", () => {
    const numbers = Array.from({ length: 100 }, () => 0);
    numbers[0] = 2_000;
    numbers[99] = -1_000;

    expect(twoSum(numbers, 1_000)).toEqual([0, 99]);
  });
});
