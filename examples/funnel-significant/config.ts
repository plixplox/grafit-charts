import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Commerce funnel' },
    subtitle: { text: 'minShare leaves the tail of the funnel unlabelled' },
    series: [
      {
        type: 'cone-funnel',
        stageField: 'stage',
        valueField: 'value',
        name: 'Users',
        label: {
          placement: 'outside',
          minShare: 0.02,
          formatter: ({ stage, value }) => `${stage} — ${value.toLocaleString('en-US')}`,
        },
      },
    ],
    legend: { enabled: false },
  };
}
