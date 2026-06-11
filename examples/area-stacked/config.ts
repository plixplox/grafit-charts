import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Requests by Channel' },
    series: [
      { type: 'area', xField: 'month', yField: 'web', name: 'Web', stacked: true },
      { type: 'area', xField: 'month', yField: 'app', name: 'App', stacked: true },
      { type: 'area', xField: 'month', yField: 'api', name: 'API', stacked: true },
    ],
  };
}
