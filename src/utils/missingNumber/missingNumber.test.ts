import { describe, expect, it } from "vitest";
import missingNumber from "./missingNumber";

describe("missingNumber", () => {
  it.each([
    ["the only value is missing", [1], 0],
    ["the largest value is missing from a single-element array", [0], 1],
    ["a middle value is missing", [1, 3, 0], 2],
    ["the largest value is missing", [3, 0, 4, 2, 1], 5],
  ] as const)("returns the expected result when %s", (_scenario, numbers, expected) => {
    expect(missingNumber(numbers)).toBe(expected);
  });

  it("handles the maximum input size", () => {
    const numbers = Array.from({ length: 10_000 }, (_, index) => index);

    expect(missingNumber(numbers)).toBe(10_000);
  });
});
