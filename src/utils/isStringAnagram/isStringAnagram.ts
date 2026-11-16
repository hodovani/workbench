/**
 * Returns whether two strings are anagrams.
 * Assumes both strings contain only lowercase English letters (`a`-`z`).
 */
export default function isStringAnagram(str1: string, str2: string): boolean {
  if (str1.length !== str2.length) return false;

  const counts = Array<number>(26).fill(0);

  for (let index = 0; index < str1.length; index++) {
    const firstCharIndex = str1.charCodeAt(index) - 97;
    const secondCharIndex = str2.charCodeAt(index) - 97;
    counts[firstCharIndex] = (counts[firstCharIndex] ?? 0) + 1;
    counts[secondCharIndex] = (counts[secondCharIndex] ?? 0) - 1;
  }

  return counts.every((count) => count === 0);
}
