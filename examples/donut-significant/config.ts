import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Labels for what carries the chart' },
    subtitle: { text: 'minShare leaves the tail of slivers unlabelled' },
    legend: { enabled: false },
    series: [
      {
        type: 'donut',
        angleField: 'revenue',
        angleName: 'Revenue',
        labelField: 'brand',
        sectorSpacing: 4,
        cornerRadius: 6,
        // under four percent of the total a sector is drawn but not labelled
        label: { minShare: 0.04, value: { enabled: true, type: 'value', format: ',.0f' } },
      },
    ],
  };
}
