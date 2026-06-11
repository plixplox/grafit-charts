export function getData() {
  return [
    {
      label: 'Frontend',
      children: [
        { label: 'app', size: 420 },
        { label: 'widgets', size: 180 },
        { label: 'shared', size: 310 },
      ],
    },
    {
      label: 'Backend',
      children: [
        { label: 'api', size: 540 },
        { label: 'workers', size: 230 },
        { label: 'db', size: 160 },
      ],
    },
    {
      label: 'Infra',
      children: [
        { label: 'ci', size: 90 },
        { label: 'deploy', size: 140 },
      ],
    },
  ];
}
