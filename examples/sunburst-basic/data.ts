export function getData() {
  return [
    {
      label: 'Europe',
      children: [
        { label: 'Germany', size: 84 },
        { label: 'France', size: 65 },
        { label: 'Poland', size: 38 },
      ],
    },
    {
      label: 'Asia',
      children: [
        { label: 'Japan', size: 125 },
        { label: 'Korea', size: 52 },
        { label: 'Vietnam', size: 98 },
      ],
    },
    { label: 'Other', size: 75 },
  ];
}
