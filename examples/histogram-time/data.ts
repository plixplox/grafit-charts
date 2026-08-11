/** Orders as they came in — one row per order, no aggregation done for the chart. */
export function getData() {
  const rows: Array<{ placedAt: string; amount: number; channel: string }> = [];
  // a deterministic walk: enough orders per week to make the months differ
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let day = 0; day < 180; day++) {
    const date = new Date(Date.UTC(2025, 0, 1 + day));
    const orders = 1 + Math.floor(next() * 4);
    for (let index = 0; index < orders; index++) {
      rows.push({
        placedAt: date.toISOString(),
        amount: Math.round(40 + next() * 160),
        channel: next() > 0.45 ? 'Web' : 'App',
      });
    }
  }
  return rows;
}
