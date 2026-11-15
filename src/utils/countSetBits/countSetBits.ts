/**
 * Counts the 1 bits in a positive 32-bit integer.
 * Time Complexity: O(log n), where n is the input number.
 * Space Complexity: O(1).
 */
export default function countSetBits(num: number): number {
  let count = 0;

  while (num > 0) {
    count += num & 1;
    num >>= 1;
  }

  return count;
}
