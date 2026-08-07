import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Initial window by item count' },
    subtitle: { text: '365 points, the first 30 of them visible at first' },
    series: [{ type: 'line', xField: 'date', yField: 'value', name: 'Metric', marker: { enabled: false } }],
    axes: [
      { type: 'time', position: 'bottom' },
      { type: 'number', position: 'left' },
    ],
    zoom: { enabled: true, visibleCount: 30 },
    navigator: { enabled: true },
    legend: { enabled: false },
  };
}
