import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Commerce funnel' },
    subtitle: { text: 'the name and the share of the total, each with its own font' },
    series: [
      {
        type: 'cone-funnel',
        stageField: 'stage',
        valueField: 'value',
        name: 'Users',
        label: {
          placement: 'outside',
          layout: 'stacked',
          category: { fontWeight: 'bold' },
          value: { type: 'percent', fontSize: 11, color: '#8a8f98' },
        },
      },
    ],
    legend: { enabled: false },
  };
}
