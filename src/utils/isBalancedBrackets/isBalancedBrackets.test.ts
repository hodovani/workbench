import { describe, expect, it } from "vitest";
import isBalancedBrackets from "./isBalancedBrackets";

describe("isBalancedBrackets", () => {
  it.each([
    ["a round bracket pair", "()", true],
    ["a square bracket pair", "[]", true],
    ["a curly bracket pair", "{}", true],
    ["nested pairs", "([])", true],
    ["adjacent balanced groups", "([]){}", true],
    ["brackets closed in the wrong order", "([)]", false],
    ["a closer with no opener", ")", false],
    ["a closer that does not match the latest opener", "(]", false],
    ["an opener left unclosed", "(", false],
  ] as const)("returns the expected result for %s", (_scenario, input, expected) => {
    expect(isBalancedBrackets(input)).toBe(expected);
  });
});
