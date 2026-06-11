export function getData() {
  const values: Array<{ score: number }> = [];
  for (let i = 0; i < 120; i++) {
    const u = ((i * 9301 + 49297) % 233280) / 233280;
    values.push({ score: Math.round(35 + 50 * u + 15 * Math.sin(i) ** 2) });
  }
  return values;
}
