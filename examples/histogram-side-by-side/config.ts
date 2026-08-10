import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// The groups split the bin between them; groupGap keeps the bars apart.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Session duration by plan' },
    subtitle: { text: 'groupMode: grouped' },
    series: [
      {
        type: 'histogram',
        xField: 'duration',
        groupField: 'plan',
        groupMode: 'grouped',
        groupGap: 0.15,
        binWidth: 10,
      },
    ],
  };
}
