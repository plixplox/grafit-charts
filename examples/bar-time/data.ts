/** Monthly sales — February is missing, and a continuous axis leaves its place empty. */
export function getData() {
  const month = (index: number) => new Date(Date.UTC(2025, index, 1));
  return [
    { date: month(0), plan: 120, actual: 108 },
    { date: month(2), plan: 130, actual: 141 },
    { date: month(3), plan: 135, actual: 129 },
    { date: month(4), plan: 140, actual: 152 },
    { date: month(5), plan: 145, actual: 138 },
    { date: month(6), plan: 150, actual: 163 },
  ];
}
