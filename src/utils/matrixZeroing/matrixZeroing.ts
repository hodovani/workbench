/**
 * Zeroes every row and column containing an original zero, in place.
 * Uses the first row and column as markers.
 * Time: O(m * n). Extra space: O(1).
 * @param matrix A rectangular m × n matrix with 1–100 rows and columns
 * and values from -1000 to 1000, inclusive.
 */
export default function matrixZeroing(matrix: number[][]): void {
  const [firstRow] = matrix;
  if (!firstRow) return;

  const columnCount = firstRow.length;
  // Record the boundary zeros before any shared row references can expose markers.
  const zeroFirstColumn = matrix.some((row) => row[0] === 0);
  if (firstRow.includes(0)) {
    firstRow[0] = 0;
  }

  for (const row of matrix) {
    if (row === firstRow) continue;
    for (let column = 1; column < columnCount; column++) {
      if (row[column] === 0) {
        row[0] = 0;
        firstRow[column] = 0;
      }
    }
  }

  for (const row of matrix) {
    if (row === firstRow) continue;
    for (let column = 1; column < columnCount; column++) {
      if (row[0] === 0 || firstRow[column] === 0) {
        row[column] = 0;
      }
    }
  }

  // The top-left cell still holds the first-row marker until the column is cleared.
  if (firstRow[0] === 0) {
    firstRow.fill(0);
  }
  if (zeroFirstColumn) {
    for (const row of matrix) {
      row[0] = 0;
    }
  }
}
