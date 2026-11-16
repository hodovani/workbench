import { describe, expect, it } from "vitest";
import isStringAnagram from "./isStringAnagram";

describe("isStringAnagram", () => {
  it.each([
    ["one matching character", "a", "a", true],
    ["one different character", "a", "b", false],
    ["matching repeated characters", "aaa", "aaa", true],
    ["the same characters in a different order", "aza", "zaa", true],
    ["different character frequencies", "hello", "bello", false],
    ["different lengths", "ab", "aba", false],
  ] as const)("returns the expected result for %s", (_scenario, str1, str2, expected) => {
    expect(isStringAnagram(str1, str2)).toBe(expected);
  });

  it("handles strings at the maximum input length", () => {
    const str1 = `${"a".repeat(999)}z`;
    const str2 = `z${"a".repeat(999)}`;

    expect(isStringAnagram(str1, str2)).toBe(true);
    expect(isStringAnagram(str1, `${str1.slice(0, -1)}y`)).toBe(false);
  });
});
