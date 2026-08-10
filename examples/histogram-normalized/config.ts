import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// Every bin scaled to 100%: the composition of each duration band.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Plan mix by session duration' },
    subtitle: { text: 'groupMode: normalized' },
    series: [
      {
        type: 'histogram',
        xField: 'duration',
        groupField: 'plan',
        groupMode: 'normalized',
        binWidth: 10,
        label: { enabled: true, placement: 'center', formatter: ({ value }) => (value > 12 ? `${Math.round(value)}%` : '') },
      },
    ],
  };
}
