export function getData() {
  const start = Date.UTC(2024, 0, 1);
  const day = 24 * 60 * 60 * 1000;
  const points = [];
  let value = 120;
  for (let i = 0; i < 365; i++) {
    value += Math.sin(i / 24) * 2 + ((i * 11) % 7) - 3;
    points.push({ date: new Date(start + i * day), value: Math.round(value * 10) / 10 });
  }
  return points;
}
