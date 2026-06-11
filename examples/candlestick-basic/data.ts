export function getData() {
  const start = Date.UTC(2025, 8, 1);
  const day = 24 * 60 * 60 * 1000;
  const data: Array<{ date: Date; open: number; high: number; low: number; close: number }> = [];
  let price = 250;
  for (let i = 0; i < 45; i++) {
    const weekday = new Date(start + i * day).getUTCDay();
    if (weekday === 0 || weekday === 6) continue; // ordinal-time leaves no gaps
    const drift = Math.sin(i / 6) * 3 + ((i * 11) % 7) - 3;
    const open = price;
    const close = Math.round((price + drift) * 100) / 100;
    const high = Math.max(open, close) + ((i * 5) % 4) + 1;
    const low = Math.min(open, close) - ((i * 3) % 4) - 1;
    data.push({ date: new Date(start + i * day), open, high, low, close });
    price = close;
  }
  return data;
}
