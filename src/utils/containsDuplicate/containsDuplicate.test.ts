import { describe, expect, it } from "vitest";
import containsDuplicate from "./containsDuplicate";

describe("containsDuplicate", () => {
  it.each([
    ["unique values", [5, 7, 1, 0xff, 0.01], false],
    ["a repeated value", [10, 7, 0, 0, 0.255e3, 0.01, 0.01], true],
    ["multiple repeated values", [3, 2, 6, 5, 0, 3, 10, 3, 10, 5], true],
    ["empty array", [], false],
    ["single value", [42], false],
  ] as const)("returns the expected result for %s", (_scenario, numbers, expected) => {
    expect(containsDuplicate(numbers)).toBe(expected);
  });
});
