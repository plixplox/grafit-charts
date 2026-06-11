import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Bar Corner Radius and Stroke' },
    series: [
      {
        type: 'bar',
        xField: 'quarter',
        yField: 'revenue',
        name: 'Revenue',
        cornerRadius: 8,
        fill: '#6f5bd7',
        fillOpacity: 0.85,
        stroke: '#4a3aa8',
        strokeWidth: 1.5,
      },
    ],
    legend: { enabled: false },
  };
}
