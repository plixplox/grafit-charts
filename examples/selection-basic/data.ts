export function getData() {
  const points = [];
  for (let i = 0; i < 40; i++) {
    points.push({
      effort: Math.round(((i * 17) % 40) + ((i * 7) % 13)),
      impact: Math.round(((i * 23) % 45) + ((i * 5) % 11)),
    });
  }
  return points;
}
