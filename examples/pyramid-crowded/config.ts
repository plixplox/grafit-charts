import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Org pyramid' },
    subtitle: { text: 'minShare and avoidOverlap thin out the labels toward the apex' },
    series: [
      {
        type: 'pyramid',
        stageField: 'level',
        valueField: 'people',
        itemSpacing: 2,
        label: { placement: 'inside', minShare: 0.1, avoidOverlap: true, fontWeight: 'bold' },
      },
    ],
    legend: { enabled: false },
  };
}
