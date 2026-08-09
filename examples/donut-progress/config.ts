import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Year progress' },
    series: [
      {
        type: 'donut',
        angleField: 'value',
        labelField: 'state',
        innerRadiusRatio: 0.78,
        rotation: 0,
        fills: ['#21a06c', '#e8eaee'],
        label: { enabled: false },
        innerLabels: [
          { text: '68%', fontSize: 26, fontWeight: 'bold' },
          { text: 'of plan complete', fontSize: 12 },
        ],
      },
    ],
    legend: { enabled: false },
  };
}
