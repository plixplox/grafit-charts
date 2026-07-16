import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Revenue by Product Category' },
    subtitle: { text: '$B, grouped categories year → quarter' },
    series: [
      { type: 'bar', xField: 'period', yField: 'iphone', name: 'iPhone', direction: 'horizontal' },
      { type: 'bar', xField: 'period', yField: 'mac', name: 'Mac', direction: 'horizontal' },
      { type: 'bar', xField: 'period', yField: 'services', name: 'Services', direction: 'horizontal' },
    ],
    axes: [
      { type: 'grouped-category', position: 'left' },
      { type: 'number', position: 'bottom' },
    ],
  };
}
