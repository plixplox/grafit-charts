import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Exponential Growth' },
    subtitle: { text: 'logarithmic Y axis' },
    series: [{ type: 'line', xField: 'year', yField: 'users', name: 'Users' }],
    axes: [
      { type: 'category', position: 'bottom' },
      { type: 'log', position: 'left' },
    ],
    legend: { enabled: false },
  };
}
