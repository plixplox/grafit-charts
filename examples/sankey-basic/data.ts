export function getData() {
  return [
    { from: 'Traffic', to: 'Organic', value: 620 },
    { from: 'Traffic', to: 'Ads', value: 380 },
    { from: 'Organic', to: 'Sign-up', value: 240 },
    { from: 'Ads', to: 'Sign-up', value: 190 },
    { from: 'Organic', to: 'Bounce', value: 380 },
    { from: 'Ads', to: 'Bounce', value: 190 },
    { from: 'Sign-up', to: 'Subscription', value: 160 },
    { from: 'Sign-up', to: 'Freemium', value: 270 },
  ];
}
