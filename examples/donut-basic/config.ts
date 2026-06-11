import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Order statuses' },
    series: [
      {
        type: 'donut',
        angleField: 'count',
        angleName: 'Orders',
        labelField: 'status',
        innerRadiusRatio: 0.62,
        // callout lines: length and style of each segment are configured separately
        calloutLine: {
          radial: { length: 10, strokeWidth: 1 },
          horizontal: { length: 14, strokeWidth: 1 },
        },
        innerLabels: [
          { text: '2193', fontSize: 22, fontWeight: 'bold' },
          { text: 'orders', fontSize: 12 },
        ],
      },
    ],
    legend: { position: 'right' },
  };
}
