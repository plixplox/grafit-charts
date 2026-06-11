import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Annotations' },
    series: [{ type: 'line', xField: 'month', yField: 'price', name: 'Price' }],
    annotations: [
      { type: 'horizontal-line', value: 180, stroke: '#e5484d', label: { text: 'resistance 180' } },
      { type: 'range', axis: 'x', range: ['Mar', 'Apr'], label: { text: 'correction' } },
      { type: 'line', start: { x: 'Jan', y: 140 }, end: { x: 'Aug', y: 196 }, stroke: '#21a06c', lineDash: [6, 4] },
      { type: 'text', x: 'Jun', y: 192, text: 'peak' },
    ],
    legend: { enabled: false },
  };
}
