export function toPgVector(values: number[]): string {
  // pgvector accepts a text format like: '[1,2,3]'
  return `[${values.map((v) => Number(v).toFixed(8)).join(',')}]`;
}
