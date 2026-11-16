/**
 * Counts the ways to climb a staircase taking one or two steps at a time.
 * Time Complexity: O(n), where n is the number of steps.
 * Space Complexity: O(1).
 */
export default function staircaseClimbingCombinations(steps: number): number {
  if (steps === 1) return 1;
  if (steps === 2) return 2;

  let first = 1;
  let second = 2;

  for (let i = 2; i < steps; i++) {
    [first, second] = [second, first + second];
  }

  return second;
}
