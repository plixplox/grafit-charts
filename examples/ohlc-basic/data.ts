export function getData() {
  const start = Date.UTC(2025, 10, 3);
  const day = 24 * 60 * 60 * 1000;
  const data: Array<{ date: Date; open: number; high: number; low: number; close: number }> = [];
  let price = 88;
  for (let i = 0; i < 30; i++) {
    const weekday = new Date(start + i * day).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const drift = Math.cos(i / 4) * 2 + ((i * 7) % 5) - 2;
    const open = price;
    const close = Math.round((price + drift) * 100) / 100;
    data.push({
      date: new Date(start + i * day),
      open,
      high: Math.max(open, close) + 1.5,
      low: Math.min(open, close) - 1.2,
      close,
    });
    price = close;
  }
  return data;
}
