import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Scatter with labels on the right' },
    series: [
      {
        type: 'scatter',
        xField: 'x',
        yField: 'y',
        name: 'Points',
        label: {
          enabled: true,
          placement: 'right',
          formatter: ({ value, datum }) => `(${datum.x}; ${value})`,
        },
      },
    ],
    legend: { enabled: false },
  };
}
