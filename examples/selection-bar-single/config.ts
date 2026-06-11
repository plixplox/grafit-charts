import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Single: one bar' },
    subtitle: { text: 'click selects a bar, the next click moves the selection' },
    series: [{ type: 'bar', xField: 'month', yField: 'revenue', name: 'Revenue' }],
    selection: { enabled: true },
    legend: { enabled: false },
  };
}
