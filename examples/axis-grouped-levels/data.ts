/** Three levels on the axis: year → half (raw number) → quarter. */
export function getData() {
  return [
    { period: ['2023', 1, 'Q1'], revenue: 117 },
    { period: ['2023', 1, 'Q2'], revenue: 94 },
    { period: ['2023', 2, 'Q3'], revenue: 82 },
    { period: ['2023', 2, 'Q4'], revenue: 120 },
    { period: ['2024', 1, 'Q1'], revenue: 126 },
    { period: ['2024', 1, 'Q2'], revenue: 91 },
    { period: ['2024', 2, 'Q3'], revenue: 88 },
    { period: ['2024', 2, 'Q4'], revenue: 134 },
  ];
}
