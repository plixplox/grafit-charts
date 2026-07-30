import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'High-contrast preset' },
    series: [
      { type: 'bar', xField: 'quarter', yField: 'product', name: 'Product' },
      { type: 'line', xField: 'quarter', yField: 'service', name: 'Service' },
    ],
    // the preset inks up the chrome on its own: ticks on, solid grid, thicker lines
    theme: 'contrast',
  };
}
