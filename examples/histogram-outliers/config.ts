import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Order size' },
    subtitle: { text: 'domain: [0, 150], outliers piled into the last bin' },
    series: [
      {
        type: 'histogram',
        xField: 'amount',
        name: 'Orders',
        domain: [0, 150],
        binWidth: 15,
        outliers: 'clamp',
        label: { enabled: true },
      },
    ],
    legend: { enabled: false },
  };
}
