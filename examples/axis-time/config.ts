import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Metric over Time' },
    series: [{ type: 'line', xField: 'date', yField: 'value', name: 'Value', marker: { enabled: false } }],
    axes: [
      { type: 'time', position: 'bottom' },
      { type: 'number', position: 'left' },
    ],
    legend: { enabled: false },
  };
}
