import { describe, expect, it } from "vitest";
import matrixZeroing from "./matrixZeroing";

const cases: [string, number[][], number[][]][] = [
  [
    "zeros in the first row and the interior",
    [
      [1, 2, 0],
      [4, 0, 6],
      [7, 8, 9],
    ],
    [
      [0, 0, 0],
      [0, 0, 0],
      [7, 0, 0],
    ],
  ],
  [
    "no zeros",
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
  ],
  [
    "an interior zero in a rectangular matrix",
    [
      [1, 2],
      [3, 4],
      [5, 0],
      [7, 8],
    ],
    [
      [1, 0],
      [3, 0],
      [0, 0],
      [7, 0],
    ],
  ],
  [
    "a zero in the first column below the first row",
    [
      [1, 2],
      [0, 4],
    ],
    [
      [0, 2],
      [0, 0],
    ],
  ],
  [
    "a zero in the top-left corner",
    [
      [0, 2],
      [3, 4],
    ],
    [
      [0, 0],
      [0, 4],
    ],
  ],
  ["one row", [[-1000, 0, 1000]], [[0, 0, 0]]],
  ["one column", [[-1000], [0], [1000]], [[0], [0], [0]]],
];

describe("matrixZeroing", () => {
  it.each(
    cases,
  )("zeroes the matrix in place for %s", (_case, matrix, expected) => {
    const originalRows = [...matrix];

    matrixZeroing(matrix);

    expect(matrix).toEqual(expected);
    for (const [rowIndex, row] of originalRows.entries()) {
      expect(matrix[rowIndex]).toBe(row);
    }
  });

  it("only uses original zeros when matrix rows share references", () => {
    const firstRow = [1, 2];
    const rowWithZero = [3, 0];
    const matrix = [firstRow, rowWithZero, rowWithZero, firstRow];

    matrixZeroing(matrix);

    expect(firstRow).toEqual([1, 0]);
    expect(rowWithZero).toEqual([0, 0]);
  });

  it("zeroes the last row and column in a 100 by 100 matrix", () => {
    const matrix = Array.from({ length: 100 }, () =>
      Array<number>(100).fill(-1000),
    );
    const lastRow = Array<number>(100).fill(1000);
    lastRow[99] = 0;
    matrix[99] = lastRow;

    matrixZeroing(matrix);

    const expectedRow = [...Array<number>(99).fill(-1000), 0];
    for (const row of matrix.slice(0, 99)) {
      expect(row).toEqual(expectedRow);
    }
    expect(lastRow).toEqual(Array<number>(100).fill(0));
  });
});
