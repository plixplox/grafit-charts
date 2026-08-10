export function getData() {
  const values: Array<{ response: number }> = [];
  for (let i = 0; i < 400; i++) {
    const u = ((i * 9301 + 49297) % 233280) / 233280;
    const v = ((i * 7621 + 1) % 233280) / 233280;
    values.push({ response: Math.round(120 + 55 * (Math.sqrt(-2 * Math.log(u + 1e-6)) * Math.cos(2 * Math.PI * v))) });
  }
  return values.filter((d) => d.response > 0 && d.response < 320);
}
