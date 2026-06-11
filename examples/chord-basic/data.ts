export function getData() {
  return [
    { from: 'API', to: 'Auth', calls: 320 },
    { from: 'API', to: 'Billing', calls: 180 },
    { from: 'Web', to: 'API', calls: 540 },
    { from: 'Mobile', to: 'API', calls: 410 },
    { from: 'Billing', to: 'Auth', calls: 90 },
    { from: 'Web', to: 'Auth', calls: 130 },
  ];
}
