import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Team velocity' },
    series: [
      { type: 'bar', xField: 'sprint', yField: 'done', name: 'Done', stacked: true },
      { type: 'bar', xField: 'sprint', yField: 'carry', name: 'Carried over', stacked: true },
    ],
    // legend on the right; clicking an item hides the series
    legend: { position: 'right' },
  };
}
