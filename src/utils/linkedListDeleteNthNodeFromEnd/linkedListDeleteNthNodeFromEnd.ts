export interface ListNode {
  val: number;
  next: ListNode | null;
}

/**
 * Deletes the n-th node from the end of a finite, acyclic linked list.
 * Time: O(length); space: O(1).
 * @param head The head of the list, or null if it is empty.
 * @param n The 1-based position from the end, within the list length.
 * @returns The updated head of the list.
 */
export default function linkedListDeleteNthNodeFromEnd(
  head: ListNode | null,
  n: number,
): ListNode | null {
  const dummy: ListNode = { val: 0, next: head };
  let fast = head;
  let slow: ListNode | null = dummy;

  for (let step = 0; step < n; step++) {
    if (fast === null) return head;
    fast = fast.next;
  }

  while (fast !== null) {
    fast = fast.next;
    slow = slow?.next ?? null;
  }

  if (slow !== null) slow.next = slow.next?.next ?? null;

  return dummy.next;
}
