import { describe, expect, it } from "vitest";
import countGridIslands from "./countGridIslands";

const cases: [string, number[][], number][] = [
  [
    "the first example",
    [
      [1, 0],
      [0, 0],
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    2,
  ],
  [
    "the second example",
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    1,
  ],
  [
    "one horizontal island",
    [
      [1, 1, 1],
      [0, 0, 0],
      [0, 0, 0],
    ],
    1,
  ],
  [
    "diagonal land cells as separate islands",
    [
      [1, 0],
      [0, 1],
    ],
    2,
  ],
  [
    "land connected along the grid edges",
    [
      [0, 1],
      [1, 1],
    ],
    1,
  ],
  [
    "a grid with no land",
    [
      [0, 0],
      [0, 0],
    ],
    0,
  ],
  ["an empty grid", [], 0],
];

describe("countGridIslands", () => {
  it.each(cases)("counts islands for %s", (_scenario, grid, expected) => {
    expect(countGridIslands(grid)).toBe(expected);
  });

  it("handles a 100 by 100 island", () => {
    const grid = Array.from({ length: 100 }, () => Array<number>(100).fill(1));

    expect(countGridIslands(grid)).toBe(1);
  });
});
