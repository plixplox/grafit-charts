export function getData() {
  return [
    { service: 'API', min: 18, q1: 32, median: 41, q3: 55, max: 96 },
    { service: 'Web', min: 25, q1: 48, median: 62, q3: 81, max: 140 },
    { service: 'Search', min: 12, q1: 22, median: 28, q3: 38, max: 71 },
    { service: 'Payments', min: 30, q1: 52, median: 70, q3: 95, max: 180 },
  ];
}
