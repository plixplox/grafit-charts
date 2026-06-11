import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Plan vs Actual by Team' },
    series: [
      { type: 'bar', xField: 'team', yField: 'plan', name: 'Plan' },
      { type: 'bar', xField: 'team', yField: 'fact', name: 'Actual' },
    ],
  };
}
