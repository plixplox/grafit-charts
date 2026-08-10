export function getData() {
  const values: Array<{ amount: number }> = [];
  for (let i = 0; i < 300; i++) {
    const u = ((i * 9301 + 49297) % 233280) / 233280;
    const v = ((i * 7621 + 1) % 233280) / 233280;
    values.push({ amount: Math.round(60 + 22 * (Math.sqrt(-2 * Math.log(u + 1e-6)) * Math.cos(2 * Math.PI * v))) });
  }
  // a handful of large orders that would otherwise stretch the axis to 900
  return [...values.filter((d) => d.amount > 0), { amount: 380 }, { amount: 520 }, { amount: 910 }];
}
