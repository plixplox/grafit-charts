import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Service Latency' },
    subtitle: { text: 'ms, distribution over 24 hours' },
    series: [
      {
        type: 'box-plot',
        xField: 'service',
        minField: 'min',
        q1Field: 'q1',
        medianField: 'median',
        q3Field: 'q3',
        maxField: 'max',
      },
    ],
    legend: { enabled: false },
  };
}
