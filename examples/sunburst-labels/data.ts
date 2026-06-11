export function getData() {
  return [
    {
      label: 'Product',
      children: [
        { label: 'Web', size: 34 },
        { label: 'iOS', size: 22 },
        { label: 'Android', size: 18 },
      ],
    },
    {
      label: 'Platform',
      children: [
        { label: 'API', size: 26 },
        { label: 'Data', size: 16 },
      ],
    },
    {
      label: 'Support',
      children: [
        { label: 'SLA', size: 12 },
        { label: 'Docs', size: 8 },
      ],
    },
  ];
}
