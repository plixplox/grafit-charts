import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Light theme (default)' },
    series: [
      { type: 'bar', xField: 'month', yField: 'desktop', name: 'Desktop' },
      { type: 'line', xField: 'month', yField: 'mobile', name: 'Mobile' },
    ],
    theme: 'default',
  };
}
