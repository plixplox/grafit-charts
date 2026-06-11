export function getData() {
  return [
    {
      label: 'Frontend',
      children: [
        { label: 'App', size: 34 },
        { label: 'Widgets', size: 22 },
        { label: 'UI Kit', size: 18 },
        { label: 'Utils', size: 8 },
      ],
    },
    {
      label: 'Backend',
      children: [
        { label: 'API', size: 28 },
        { label: 'Jobs', size: 14 },
        { label: 'Auth', size: 9 },
      ],
    },
    {
      label: 'Infra',
      children: [
        { label: 'CI', size: 12 },
        { label: 'IaC', size: 10 },
      ],
    },
  ];
}
