import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Reservoir level' },
    series: [
      {
        type: 'linear-gauge',
        orientation: 'vertical',
        value: 15_400_000,
        target: 18_000_000,
        scale: { min: 0, max: 24_000_000 },
        segments: [
          { to: 8_000_000, color: '#e5484d' },
          { to: 16_000_000, color: '#f4a236' },
          { to: 24_000_000, color: '#21a06c' },
        ],
        label: { formatter: (value) => `${(value / 1e6).toFixed(1)} mln m³` },
        ticks: { formatter: (value) => `${value / 1e6} mln` },
      },
    ],
  };
}
