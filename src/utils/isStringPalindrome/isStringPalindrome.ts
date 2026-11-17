/**
 * Checks whether a string is a palindrome after ignoring non-alphanumeric
 * ASCII characters and letter case.
 * Time: O(n); space: O(1).
 * @param str A printable ASCII string.
 */
export default function isStringPalindrome(str: string): boolean {
  let left = 0;
  let right = str.length - 1;
  const isAlphanumeric = (character: string) => /[a-z0-9]/i.test(character);

  while (left < right) {
    while (left < right && !isAlphanumeric(str.charAt(left))) left++;
    while (left < right && !isAlphanumeric(str.charAt(right))) right--;

    if (str.charAt(left).toLowerCase() !== str.charAt(right).toLowerCase()) {
      return false;
    }

    left++;
    right--;
  }

  return true;
}
