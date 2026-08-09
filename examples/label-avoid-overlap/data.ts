export function getData() {
  const visits = [
    118, 126, 131, 129, 140, 152, 149, 143, 138, 146, 158, 167, 171, 169, 160, 152, 147, 151, 163, 176, 181, 174, 168, 172,
  ];
  return visits.map((value, index) => ({ day: `${index + 1}`, visits: value }));
}
