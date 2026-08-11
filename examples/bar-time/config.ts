import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Sales by month' },
    subtitle: { text: 'February has no data — a continuous axis keeps its place' },
    series: [
      { type: 'bar', xField: 'date', yField: 'plan', name: 'Plan' },
      { type: 'bar', xField: 'date', yField: 'actual', name: 'Actual' },
    ],
    axes: [
      { type: 'time', position: 'bottom' },
      { type: 'number', position: 'left', title: { text: 'M₽' } },
    ],
    legend: { position: 'bottom' },
  };
}
