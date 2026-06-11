import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Sales vs target' },
    series: [
      {
        type: 'linear-gauge',
        value: 7.4,
        target: 9,
        scale: { min: 0, max: 12 },
        thickness: 22,
        label: { formatter: (value) => `${value.toFixed(1)} of 12M` },
      },
    ],
  };
}
