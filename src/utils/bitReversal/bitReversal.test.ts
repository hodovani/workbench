import { describe, expect, it } from "vitest";
import bitReversal from "./bitReversal";

describe("bitReversal", () => {
  it.each([
    ["zero", 0, 0],
    ["the lowest set bit", 1, 2_147_483_648],
    ["two lowest set bits", 3, 3_221_225_472],
    ["a set bit in the middle", 8, 268_435_456],
    ["the maximum input", 1_000_000, 37_941_248],
  ] as const)("reverses the bits of %s", (_scenario, n, expected) => {
    expect(bitReversal(n)).toBe(expected);
  });
});
