import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Latency p95' },
    series: [{ type: 'line', xField: 'month', yField: 'latency', name: 'p95, ms' }],
    axes: [
      {
        type: 'category',
        position: 'bottom',
        crossLines: [{ type: 'range', range: ['Apr', 'May'], label: { text: 'incident' } }],
      },
      {
        type: 'number',
        position: 'left',
        crossLines: [{ value: 200, stroke: '#e5484d', label: { text: 'SLO 200 ms', color: '#e5484d' } }],
      },
    ],
    legend: { enabled: false },
  };
}
