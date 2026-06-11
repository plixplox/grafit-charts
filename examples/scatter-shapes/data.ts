export function getData() {
  const data: Array<Record<string, number>> = [];
  const groups = [
    { key: 'alpha', cx: 30, cy: 40 },
    { key: 'beta', cx: 60, cy: 70 },
    { key: 'gamma', cx: 75, cy: 30 },
  ];
  groups.forEach((g, gi) => {
    for (let i = 0; i < 14; i++) {
      data.push({
        x: g.cx + (((i * 13 + gi * 7) % 21) - 10),
        [g.key]: g.cy + (((i * 17 + gi * 11) % 19) - 9),
      });
    }
  });
  return data;
}
