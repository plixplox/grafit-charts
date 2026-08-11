import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Revenue by department' },
    subtitle: { text: '$M, long category names cut to the room between the ticks' },
    series: [{ type: 'bar', xField: 'department', yField: 'revenue', name: 'Revenue', cornerRadius: 2 }],
    axes: [
      {
        type: 'grouped-category',
        position: 'bottom',
        // every name stays on the axis: the ones that do not fit are cut instead of dropped
        label: { overflow: 'ellipsis' },
      },
      { type: 'number', position: 'left', label: { format: '$,d' } },
    ],
    legend: { enabled: false },
  };
}
