import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Traffic Breakdown' },
    subtitle: { text: '100%-stacked: normalizedTo: 100' },
    series: [
      { type: 'bar', xField: 'quarter', yField: 'search', name: 'Search', stacked: true, normalizedTo: 100 },
      { type: 'bar', xField: 'quarter', yField: 'social', name: 'Social', stacked: true, normalizedTo: 100 },
      { type: 'bar', xField: 'quarter', yField: 'direct', name: 'Direct', stacked: true, normalizedTo: 100 },
    ],
    axes: [
      { type: 'category', position: 'bottom' },
      { type: 'number', position: 'left', label: { formatter: ({ value }) => `${value}%` } },
    ],
  };
}
