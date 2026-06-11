import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Funnel: spacing and outside labels' },
    series: [
      {
        type: 'funnel',
        stageField: 'stage',
        valueField: 'count',
        itemSpacing: 10,
        label: {
          placement: 'outside',
          formatter: ({ stage, value }) => `${stage} — ${value.toLocaleString('en-US')}`,
        },
      },
    ],
    legend: { enabled: false },
  };
}
