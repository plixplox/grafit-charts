import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Revenue by Product Category' },
    subtitle: { text: '$B, grouped categories year → quarter' },
    series: [
      { type: 'bar', xField: 'period', yField: 'iphone', name: 'iPhone' },
      { type: 'bar', xField: 'period', yField: 'mac', name: 'Mac' },
      { type: 'bar', xField: 'period', yField: 'services', name: 'Services' },
    ],
    axes: [
      { type: 'grouped-category', position: 'bottom' },
      { type: 'number', position: 'left' },
    ],
  };
}
