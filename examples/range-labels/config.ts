import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Ranges with labels' },
    series: [
      {
        type: 'range-bar',
        xField: 'city',
        yLowField: 'min',
        yHighField: 'max',
        name: 'Temperature, °C',
        label: {
          enabled: true,
          placement: 'center',
          formatter: ({ low, high }) => `${low}…${high}`,
        },
      },
    ],
    legend: { enabled: false },
  };
}
