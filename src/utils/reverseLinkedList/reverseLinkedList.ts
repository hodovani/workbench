export interface ListNode {
  val: number;
  next: ListNode | null;
}

/**
 * Reverses a finite, acyclic linked list in place.
 * Time: O(n); space: O(1).
 * @param head The head of the list, or null for an empty list.
 * @returns The new head of the reversed list, or null when the list is empty.
 */
export default function reverseLinkedList(
  head: ListNode | null,
): ListNode | null {
  let previous: ListNode | null = null;
  let current = head;

  while (current !== null) {
    const next = current.next;
    current.next = previous;
    previous = current;
    current = next;
  }

  return previous;
}
