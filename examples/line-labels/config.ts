import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Value labels at points' },
    subtitle: { text: "placement: 'top' | 'bottom' | 'left' | 'right'" },
    series: [
      {
        type: 'line',
        xField: 'month',
        yField: 'sales',
        name: 'Sales',
        label: {
          enabled: true,
          placement: 'top',
          fontWeight: 'bold',
          formatter: ({ value }) => `${value}K`,
        },
      },
    ],
    legend: { enabled: false },
  };
}
