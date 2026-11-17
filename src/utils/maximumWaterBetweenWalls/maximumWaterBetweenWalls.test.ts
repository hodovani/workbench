import { describe, expect, it } from "vitest";
import maximumWaterBetweenWalls from "./maximumWaterBetweenWalls";

const cases: [string, number[], number][] = [
  ["the first example", [1, 4, 2, 3], 6],
  ["two equal-height walls", [1, 1], 1],
  ["a zero-height wall", [1, 0], 0],
  ["two walls at the maximum height", [10_000, 10_000], 10_000],
  ["zero-height walls around a tall wall", [0, 10_000, 0], 0],
  ["the best container between inner walls", [1, 8, 6, 2, 5, 4, 8, 3, 7], 49],
];

describe("maximumWaterBetweenWalls", () => {
  it.each(
    cases,
  )("returns the maximum area for %s", (_scenario, walls, expected) => {
    expect(maximumWaterBetweenWalls(walls)).toBe(expected);
  });

  it("handles the maximum number of walls", () => {
    const walls = Array<number>(1_000).fill(10_000);

    expect(maximumWaterBetweenWalls(walls)).toBe(9_990_000);
  });
});
