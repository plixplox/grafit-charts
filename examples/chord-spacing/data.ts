export function getData() {
  return [
    { from: 'Web', to: 'iOS', users: 18 },
    { from: 'Web', to: 'Android', users: 22 },
    { from: 'iOS', to: 'Web', users: 9 },
    { from: 'Android', to: 'Web', users: 12 },
    { from: 'iOS', to: 'Android', users: 6 },
    { from: 'Android', to: 'iOS', users: 7 },
    { from: 'Web', to: 'Desktop', users: 10 },
    { from: 'Desktop', to: 'Web', users: 5 },
  ];
}
