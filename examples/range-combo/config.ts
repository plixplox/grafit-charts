import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Range + average line' },
    series: [
      {
        type: 'range-area',
        xField: 'month',
        yLowField: 'min',
        yHighField: 'max',
        name: 'Range, °C',
        fillOpacity: 0.25,
      },
      { type: 'line', xField: 'month', yField: 'avg', name: 'Average', strokeWidth: 2.5 },
    ],
    tooltip: { mode: 'shared', range: 'nearest' },
  };
}
