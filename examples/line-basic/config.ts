import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Average temperature' },
    subtitle: { text: '°C by month' },
    series: [{ type: 'line', xField: 'month', yField: 'temperature', name: 'Temperature' }],
  };
}
