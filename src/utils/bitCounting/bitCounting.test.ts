import { describe, expect, it } from "vitest";
import bitCounting from "./bitCounting";

describe("bitCounting", () => {
  it.each([
    ["zero", 0, [0]],
    ["the first two values", 1, [0, 1]],
    ["the example with three values", 2, [0, 1, 1]],
    ["the example with a value containing two set bits", 3, [0, 1, 1, 2]],
    ["values across a power of two", 8, [0, 1, 1, 2, 1, 2, 2, 3, 1]],
  ] as const)("returns counts through %s", (_scenario, n, expected) => {
    expect(bitCounting(n)).toEqual(expected);
  });

  it("handles the maximum input", () => {
    const counts = bitCounting(10_000);

    expect(counts).toHaveLength(10_001);
    expect(counts[10_000]).toBe(5);
  });
});
