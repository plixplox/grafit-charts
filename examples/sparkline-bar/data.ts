export function getData() {
  const values = [42, 45, 43, 49, 47, 52, 50, 56, 53, 59, 62, 60, 66, 64, 71, 69, 75, 78, 74, 82];
  return values.map((value) => ({ value }));
}
