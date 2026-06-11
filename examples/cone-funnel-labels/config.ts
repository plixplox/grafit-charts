import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Cone funnel: outside labels' },
    series: [
      {
        type: 'cone-funnel',
        stageField: 'stage',
        valueField: 'count',
        itemSpacing: 2,
        label: {
          placement: 'outside',
          formatter: ({ stage, value }) => `${stage} — ${value.toLocaleString('en-US')}`,
        },
      },
    ],
    legend: { enabled: false },
  };
}
