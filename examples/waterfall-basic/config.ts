import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'P&L bridge' },
    subtitle: { text: '₽M' },
    series: [
      {
        type: 'waterfall',
        xField: 'step',
        yField: 'value',
        name: 'Change',
        // indices 3 and 6 are the subtotal and the final total
        totals: [3, 6],
      },
    ],
    legend: { enabled: false },
  };
}
