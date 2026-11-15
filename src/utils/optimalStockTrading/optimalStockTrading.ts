/**
 * Finds the maximum profit from one purchase and a later sale.
 * Time Complexity: O(n), where n is the number of prices.
 * Space Complexity: O(1).
 * @param prices The stock price on each day.
 * @returns The maximum profit, or 0 when no profit is possible.
 * @example
 * optimalStockTrading([6, 8, 1, 2, 30, 19]) // 29
 */
export default function optimalStockTrading(prices: readonly number[]): number {
  let minPrice = Infinity;
  let maxProfit = 0;

  for (const price of prices) {
    maxProfit = Math.max(maxProfit, price - minPrice);
    minPrice = Math.min(minPrice, price);
  }

  return maxProfit;
}
