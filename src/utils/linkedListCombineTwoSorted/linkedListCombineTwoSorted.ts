export interface ListNode {
  val: number;
  next: ListNode | null;
}

/**
 * Combines two ascending lists by reusing their nodes.
 * Time: O(n + m); space: O(1).
 * @param listA The head of the first list, or null.
 * @param listB The head of the second list, or null.
 * @returns The head of the combined sorted list, or null when both are empty.
 */
export default function linkedListCombineTwoSorted(
  listA: ListNode | null,
  listB: ListNode | null,
): ListNode | null {
  if (listA === null) return listB;
  if (listB === null) return listA;

  const dummy: ListNode = { val: 0, next: null };
  let tail = dummy;

  while (listA !== null && listB !== null) {
    if (listA.val <= listB.val) {
      tail.next = listA;
      tail = listA;
      listA = listA.next;
    } else {
      tail.next = listB;
      tail = listB;
      listB = listB.next;
    }
  }

  tail.next = listA ?? listB;
  return dummy.next;
}
