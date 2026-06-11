import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Salary ranges' },
    subtitle: { text: 'thousand ₽ per month' },
    series: [{ type: 'range-bar', xField: 'role', yLowField: 'from', yHighField: 'to', name: 'Range' }],
    legend: { enabled: false },
  };
}
