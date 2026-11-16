/**
 * Reverses all 32 bits of an unsigned integer.
 * The bitwise operations use signed 32-bit values, so the result is converted
 * back to an unsigned number before returning.
 * Time: O(1) (32 iterations); space: O(1).
 * @param n An unsigned integer (0 <= n <= 1,000,000).
 * @returns The decimal value of the reversed 32-bit unsigned integer.
 */
export default function bitReversal(n: number): number {
  let reversed = 0;

  for (let i = 0; i < 32; i++) {
    reversed = (reversed << 1) | (n & 1);
    n >>= 1;
  }

  return reversed >>> 0;
}
