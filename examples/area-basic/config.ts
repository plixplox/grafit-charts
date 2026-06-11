import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Website Visitors' },
    subtitle: { text: 'thousands per month' },
    series: [{ type: 'area', xField: 'month', yField: 'visitors', name: 'Visitors' }],
    legend: { enabled: false },
  };
}
