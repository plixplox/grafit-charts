import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Revenue and Margin' },
    subtitle: { text: 'thousands of euro and per cent, on their own scales' },
    series: [
      { type: 'bar', xField: 'month', yField: 'revenue', name: 'Revenue' },
      { type: 'line', xField: 'month', yField: 'margin', name: 'Margin' },
    ],
    axes: [
      { type: 'category', position: 'bottom' },
      { type: 'number', position: 'left', keys: ['revenue'], title: { text: 'Revenue, k€' } },
      { type: 'number', position: 'right', keys: ['margin'], label: { format: ',.1f' }, title: { text: 'Margin, %' } },
    ],
  };
}
