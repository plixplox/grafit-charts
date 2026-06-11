import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Histogram with bin labels' },
    series: [
      {
        type: 'histogram',
        xField: 'score',
        name: 'Scores',
        binCount: 8,
        label: { enabled: true, placement: 'top', fontWeight: 'bold' },
      },
    ],
    legend: { enabled: false },
  };
}
