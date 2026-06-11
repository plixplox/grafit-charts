import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Pyramid: spacing and inside labels' },
    series: [
      {
        type: 'pyramid',
        stageField: 'level',
        valueField: 'people',
        itemSpacing: 6,
        label: { placement: 'inside', fontWeight: 'bold' },
      },
    ],
    legend: { enabled: false },
  };
}
