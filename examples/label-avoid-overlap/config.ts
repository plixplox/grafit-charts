import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Labels That Fight for Room' },
    subtitle: { text: 'avoidOverlap keeps the first label of every crowded spot' },
    series: [
      {
        type: 'line',
        xField: 'day',
        yField: 'visits',
        name: 'Visits',
        label: {
          enabled: true,
          avoidOverlap: true,
          formatter: ({ value }) => `${value} visits`,
        },
      },
    ],
  };
}
