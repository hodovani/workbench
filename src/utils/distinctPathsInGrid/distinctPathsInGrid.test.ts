import { describe, expect, it } from "vitest";
import distinctPathsInGrid from "./distinctPathsInGrid";

describe("distinctPathsInGrid", () => {
  it.each([
    ["a single cell", 1, 1, 1],
    ["a single row", 1, 100, 1],
    ["a single column", 100, 1, 1],
    ["the 3 by 2 example", 3, 2, 3],
    ["the 5 by 7 example", 5, 7, 210],
    ["the 10 by 4 example", 10, 4, 220],
    ["a larger grid", 17, 17, 601_080_390],
  ] as const)("counts paths for %s", (_scenario, m, n, expected) => {
    expect(distinctPathsInGrid(m, n)).toBe(expected);
  });
});
