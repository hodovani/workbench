const bracketsMap: Record<string, string> = {
  "(": ")",
  "{": "}",
  "[": "]",
};

/**
 * Checks if the brackets in a string are balanced.
 * Time Complexity: O(n), where n is the length of the input string.
 * Space Complexity: O(n), where n is the length of the input string (in the worst case, all characters are opening brackets).
 * Reference: https://en.wikipedia.org/wiki/Bracket_(mathematics)#Balanced_brackets
 * Reference: https://en.wikipedia.org/wiki/Stack_(abstract_data_type)
 * Reference: https://en.wikipedia.org/wiki/Parenthesis#Balanced_parentheses
 * Reference: https://www.greatfrontend.com/interviews/study/blind75/questions/algo/array-balanced-brackets
 * Reference: https://leetcode.com/problems/valid-parentheses/
 * @param str The input string to check.
 * @returns True if the brackets are balanced, false otherwise.
 * @example
 * isBalancedBrackets("()[]{}") // true
 * isBalancedBrackets("([)]") // false
 */
export default function isBalancedBrackets(str: string): boolean {
  const stack: string[] = [];

  for (const char of str) {
    // If the character is an opening bracket, push it onto the stack
    if (bracketsMap[char]) {
      stack.push(char);
      continue;
    }

    // Else, if the character is a non-opener, check if it matches the last opening bracket
    const lastOpener = stack.pop();
    if (!lastOpener || bracketsMap[lastOpener] !== char) {
      return false;
    }
  }

  return stack.length === 0;
}
