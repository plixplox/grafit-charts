export function getData() {
  const points = [];
  let value = 100;
  for (let i = 0; i < 120; i++) {
    value += Math.sin(i / 7) * 4 + ((i * 13) % 9) - 4;
    points.push({ index: i, value: Math.round(value * 10) / 10 });
  }
  return points;
}
