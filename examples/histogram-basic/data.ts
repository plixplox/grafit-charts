export function getData() {
  const durations = [
    12, 18, 22, 25, 28, 31, 33, 35, 38, 41, 42, 44, 47, 48, 51, 53, 54, 56, 58, 61, 63, 64, 67, 71, 74, 78, 82, 87, 93, 104, 36, 45, 52, 59,
    49, 39, 29, 57, 66, 73,
  ];
  return durations.map((duration) => ({ duration }));
}
