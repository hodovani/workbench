import { describe, expect, it } from "vitest";
import arrayProductExcludingCurrent from "./arrayProductExcludingCurrent";

const cases: [string, number[], number[]][] = [
  ["the first example", [1, 2, 3], [6, 3, 2]],
  ["one zero", [2, 0, 3], [0, 6, 0]],
  ["multiple zeros", [0, 0, -1, 1], [0, 0, 0, 0]],
  ["negative values", [-1, 2, -3], [-6, 3, -2]],
  ["the minimum input length", [-2, 4], [4, -2]],
  ["a zero at the first index", [0, 1], [1, 0]],
];

describe("arrayProductExcludingCurrent", () => {
  it.each(
    cases,
  )("returns expected products for %s", (_scenario, numbers, expected) => {
    expect(arrayProductExcludingCurrent(numbers)).toEqual(expected);
  });

  it("returns a new array without changing the input", () => {
    const numbers = [1, 2, 3];
    const result = arrayProductExcludingCurrent(numbers);

    expect(result).not.toBe(numbers);
    expect(numbers).toEqual([1, 2, 3]);
  });

  it("handles the maximum input length with products within the constraint", () => {
    const numbers = [0, ...Array<number>(999).fill(1)];
    const expected = [1, ...Array<number>(999).fill(0)];

    expect(arrayProductExcludingCurrent(numbers)).toEqual(expected);
  });
});
