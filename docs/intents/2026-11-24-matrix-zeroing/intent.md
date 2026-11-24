# Matrix Zeroing utility

Status: implemented

## Problem

Workbench is missing a practice utility for setting every row and column that contains an original zero to zero.

## Desired outcome

Expose a TypeScript utility that updates the input matrix in place. Its JSDoc describes the input bounds and complexity.

## Scope and constraints

The input is a rectangular matrix with 1–100 rows and columns and values from -1000 to 1000, inclusive. Use the first row and column as markers to achieve O(m × n) time and O(1) extra space. Preserve row references.

## How we'll know

The colocated Vitest cases cover the supplied examples, first-row and first-column behavior, shared row references, and the largest valid matrix. Run the repository's pre-commit checks.

## Open questions

None.

## Delivery

- [Implementation](../../../src/utils/matrixZeroing/matrixZeroing.ts)
- [Tests](../../../src/utils/matrixZeroing/matrixZeroing.test.ts)
