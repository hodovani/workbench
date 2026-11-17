/**
 * Returns the product of every input value except the value at the same index.
 * Uses no division. Time: O(n); auxiliary space: O(1), excluding the result.
 * @param numbers The input values, whose prefix and suffix products fit in 32 bits.
 */
export default function arrayProductExcludingCurrent(
  numbers: number[],
): number[] {
  const result: number[] = [];
  let leftProduct = 1;

  // Store the product of values to the left of each index.
  for (const number of numbers) {
    result.push(leftProduct);
    leftProduct *= number;
  }

  let rightProduct = 1;
  // Multiply each left product by the product of values to its right.
  for (let index = numbers.length - 1; index >= 0; index--) {
    const productOfValuesToLeft = result[index];
    const currentNumber = numbers[index];
    if (productOfValuesToLeft === undefined || currentNumber === undefined) {
      throw new Error("Missing value during suffix pass");
    }

    const product = productOfValuesToLeft * rightProduct;
    result[index] = Object.is(product, -0) ? 0 : product;
    rightProduct *= currentNumber;
  }

  return result;
}
