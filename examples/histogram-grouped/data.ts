export function getData() {
  const rows: Array<{ duration: number; plan: string }> = [];
  for (let i = 0; i < 500; i++) {
    const u = ((i * 9301 + 49297) % 233280) / 233280;
    const v = ((i * 7621 + 1) % 233280) / 233280;
    const normal = Math.sqrt(-2 * Math.log(u + 1e-6)) * Math.cos(2 * Math.PI * v);
    // free sessions cluster low, paid ones run longer
    const free = i % 3 !== 0;
    rows.push({
      duration: Math.round((free ? 22 : 48) + (free ? 10 : 16) * normal),
      plan: free ? 'Free' : 'Pro',
    });
  }
  return rows.filter((row) => row.duration > 0 && row.duration < 100);
}
