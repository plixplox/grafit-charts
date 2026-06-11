import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Plan completion' },
    series: [
      {
        type: 'linear-gauge',
        value: 1240,
        target: 1500,
        scale: { min: 0, max: 2000 },
      },
    ],
    height: 180,
  };
}
