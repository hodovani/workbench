import { describe, expect, it } from "vitest";
import isStringPalindrome from "./isStringPalindrome";

describe("isStringPalindrome", () => {
  it.each([
    ["the Nixon example", "No 'x' in Nixon", true],
    ["the phrase example", "Was it a car or a cat I saw?", true],
    ["a non-palindrome after filtering", "tab a cat", false],
    ["mixed letters and digits", "1a2A1", true],
    ["a non-palindrome containing digits", "1a2", false],
    ["one alphanumeric character", "Z", true],
    ["no alphanumeric characters", "., !", true],
  ] as const)("checks %s", (_scenario, str, expected) => {
    expect(isStringPalindrome(str)).toBe(expected);
  });

  it("handles strings at the maximum input length", () => {
    expect(isStringPalindrome(`A${"b".repeat(1_998)}a`)).toBe(true);
    expect(isStringPalindrome(`b${"a".repeat(1_998)}c`)).toBe(false);
  });
});
