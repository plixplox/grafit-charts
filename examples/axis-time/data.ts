export function getData() {
  const start = Date.UTC(2025, 0, 1);
  const day = 24 * 60 * 60 * 1000;
  const values = [41, 43, 47, 45, 49, 53, 51, 56, 58, 55, 61, 64, 62, 67, 70, 68, 73, 71, 76, 79, 77, 82, 85, 83, 88, 86, 91, 94, 92, 97];
  return values.map((value, index) => ({ date: new Date(start + index * 3 * day), value }));
}
