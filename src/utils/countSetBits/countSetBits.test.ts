import { describe, expect, it } from "vitest";
import countSetBits from "./countSetBits";

describe("countSetBits", () => {
  it.each([
    ["the minimum positive input", 1, 1],
    ["a power of two", 8, 1],
    ["the example with two set bits", 9, 2],
    ["the example with several set bits", 123, 6],
    ["all bits set in a small binary number", 15, 4],
    ["the largest allowed input", 2 ** 31 - 1, 31],
  ] as const)("counts set bits for %s", (_scenario, num, expected) => {
    expect(countSetBits(num)).toBe(expected);
  });
});
