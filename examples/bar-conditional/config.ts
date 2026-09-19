import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Monthly Profit' },
    subtitle: { text: 'Losses in red, months over plan in green' },
    series: [
      {
        type: 'bar',
        xField: 'month',
        yField: 'profit',
        name: 'Profit',
        label: { enabled: true },
        itemStyler: ({ datum }) => {
          const profit = Number(datum.profit);
          if (profit < 0) return { fill: '#d64545', label: { color: '#d64545' } };
          if (profit > Number(datum.plan)) return { fill: '#2f9e6a' };
          // the rest keep the series color
          return undefined;
        },
      },
    ],
    legend: { enabled: false },
  };
}
