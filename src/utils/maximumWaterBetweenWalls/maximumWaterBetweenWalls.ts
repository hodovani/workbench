/**
 * Returns the largest area formed by two walls and the x-axis.
 * Time: O(n); space: O(1).
 * @param walls The wall heights, with at least two entries.
 */
export default function maximumWaterBetweenWalls(walls: number[]): number {
  let left = 0;
  let right = walls.length - 1;
  let maxArea = 0;

  while (left < right) {
    const leftHeight = walls[left];
    const rightHeight = walls[right];
    if (leftHeight === undefined || rightHeight === undefined) {
      throw new Error("Missing wall at a valid pointer index");
    }

    maxArea = Math.max(
      maxArea,
      (right - left) * Math.min(leftHeight, rightHeight),
    );

    if (leftHeight < rightHeight) {
      left++;
    } else {
      right--;
    }
  }

  return maxArea;
}
