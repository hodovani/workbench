/**
 * Returns the k most frequent values using buckets indexed by frequency.
 * Time: O(n); space: O(n).
 * @param numbers The input values.
 * @param k The number of most frequent values to return.
 */
export default function mostCommonElements(
  numbers: number[],
  k: number,
): number[] {
  const frequencies = new Map<number, number>();
  for (const number of numbers) {
    frequencies.set(number, (frequencies.get(number) ?? 0) + 1);
  }

  const buckets: number[][] = Array.from(
    { length: numbers.length + 1 },
    () => [],
  );
  for (const [number, frequency] of frequencies) {
    const bucket = buckets[frequency];
    if (bucket === undefined) {
      throw new Error("Frequency is outside the bucket range");
    }
    bucket.push(number);
  }

  const result: number[] = [];
  for (
    let frequency = numbers.length;
    frequency > 0 && result.length < k;
    frequency--
  ) {
    const bucket = buckets[frequency];
    if (bucket === undefined) {
      throw new Error("Frequency bucket is missing");
    }

    for (const number of bucket) {
      result.push(number);
      if (result.length === k) return result;
    }
  }

  return result;
}
