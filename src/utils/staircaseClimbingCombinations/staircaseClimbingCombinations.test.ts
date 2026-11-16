import { describe, expect, it } from "vitest";
import staircaseClimbingCombinations from "./staircaseClimbingCombinations";

describe("staircaseClimbingCombinations", () => {
  it.each([
    ["the minimum staircase", 1, 1],
    ["the two-step example", 2, 2],
    ["the three-step example", 3, 3],
    ["a longer staircase", 5, 8],
    ["the maximum allowed staircase", 45, 1_836_311_903],
  ] as const)("counts the combinations for %s", (_scenario, steps, expected) => {
    expect(staircaseClimbingCombinations(steps)).toBe(expected);
  });
});
