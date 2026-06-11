import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'P&L with subtotals' },
    series: [
      {
        type: 'waterfall',
        xField: 'step',
        yField: 'value',
        totals: [2, 6],
        cornerRadius: 4,
        item: {
          positive: { fill: '#21a06c' },
          negative: { fill: '#e5484d' },
          total: { fill: '#33404f' },
        },
        line: { enabled: true },
        label: {
          enabled: true,
          formatter: ({ value, isTotal }) => (isTotal ? String(value) : `${value > 0 ? '+' : ''}${value}`),
        },
      },
    ],
    legend: { enabled: false },
  };
}
