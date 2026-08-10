import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// Reference lines that follow the data: the median and the p95 of the same field
// the histogram bins, recomputed on every update.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Response time' },
    subtitle: { text: 'median and p95 as computed annotations' },
    series: [{ type: 'histogram', xField: 'response', name: 'Requests', binWidth: 25, fillOpacity: 0.7 }],
    annotations: [
      {
        type: 'vertical-line',
        value: { stat: 'median', field: 'response' },
        stroke: '#21a06c',
        label: { formatter: (value) => `median ${Math.round(value)} ms` },
      },
      {
        type: 'vertical-line',
        value: { stat: 'percentile', percentile: 95, field: 'response' },
        stroke: '#e5484d',
        label: { formatter: (value) => `p95 ${Math.round(value)} ms` },
      },
    ],
    legend: { enabled: false },
  };
}
