import Queue from "../queue/queue";

const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function markIsland(
  grid: number[][],
  rowIndex: number,
  columnIndex: number,
): void {
  const queue = new Queue<[number, number]>();
  queue.enqueue([rowIndex, columnIndex]);

  while (queue.size > 0) {
    const [currentRow, currentColumn] = queue.dequeue();
    for (const [rowOffset, columnOffset] of directions) {
      const nextRowIndex = currentRow + rowOffset;
      const nextColumnIndex = currentColumn + columnOffset;
      if (nextRowIndex < 0 || nextRowIndex >= grid.length) continue;

      const nextRow = grid[nextRowIndex];
      if (nextRow === undefined) continue;
      if (nextColumnIndex < 0 || nextColumnIndex >= nextRow.length) continue;
      if (nextRow[nextColumnIndex] !== 1) continue;

      nextRow[nextColumnIndex] = 0;
      queue.enqueue([nextRowIndex, nextColumnIndex]);
    }
  }
}

/**
 * Counts four-directionally connected groups of land, marking visited land as water.
 * Time: O(rows * columns); queue space: O(rows * columns) worst case.
 * @param grid A 2D array of 0s (water) and 1s (land).
 */
export default function countGridIslands(grid: number[][]): number {
  let islandCount = 0;

  for (const [rowIndex, row] of grid.entries()) {
    for (const [columnIndex, cell] of row.entries()) {
      if (cell !== 1) continue;

      islandCount++;
      row[columnIndex] = 0;
      markIsland(grid, rowIndex, columnIndex);
    }
  }

  return islandCount;
}
