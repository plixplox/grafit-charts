import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Cluster load' },
    series: [
      {
        type: 'radial-gauge',
        value: 67,
        scale: { min: 0, max: 100 },
        segments: [
          { to: 60, color: '#21a06c' },
          { to: 85, color: '#f4a236' },
          { to: 100, color: '#e5484d' },
        ],
        label: { formatter: (value) => `${value}%` },
      },
    ],
  };
}
