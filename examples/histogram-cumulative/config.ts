import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// The share of requests served under a given time — the distribution read as a CDF.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Response time' },
    subtitle: { text: 'cumulative share of requests, %' },
    series: [
      {
        type: 'histogram',
        xField: 'response',
        name: 'Requests',
        binWidth: 25,
        normalize: 'cumulative-percent',
        label: { enabled: true, formatter: ({ value }) => (value < 99.5 ? `${Math.round(value)}%` : '') },
      },
    ],
    legend: { enabled: false },
  };
}
