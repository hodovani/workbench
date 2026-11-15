import { describe, expect, it } from "vitest";
import optimalStockTrading from "./optimalStockTrading";

describe("optimalStockTrading", () => {
  it.each([
    ["an increasing market", [1, 2, 3, 4], 3],
    ["a declining market", [4, 3, 2, 1], 0],
    ["the lowest price before the best sale", [6, 8, 1, 2, 30, 19], 29],
    ["a single day", [10_000], 0],
    ["zero prices", [0, 0, 0], 0],
    ["maximum price values", [10_000, 0, 10_000], 10_000],
  ] as const)("returns the expected profit for %s", (_scenario, prices, expected) => {
    expect(optimalStockTrading(prices)).toBe(expected);
  });

  it("handles the maximum input size", () => {
    const prices = Array.from({ length: 10_000 }, (_, index) => index);

    expect(optimalStockTrading(prices)).toBe(9_999);
  });
});
