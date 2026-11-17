export interface ListNode {
  val: number;
  next: ListNode | null;
}

/**
 * Returns whether a linked list contains a cycle using fast and slow pointers.
 * Time: O(n); space: O(1).
 * @param head The head of the linked list, or null when it is empty.
 */
export default function linkedListDetectCycle(head: ListNode | null): boolean {
  if (head === null || head.next === null) return false;

  let fast: ListNode = head;
  let slow: ListNode = head;

  while (fast.next !== null && fast.next.next !== null && slow.next !== null) {
    fast = fast.next.next;
    slow = slow.next;

    if (fast === slow) return true;
  }

  return false;
}
