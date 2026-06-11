import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Area with Value Labels' },
    series: [
      {
        type: 'area',
        xField: 'week',
        yField: 'signups',
        name: 'Signups',
        fillOpacity: 0.25,
        marker: { enabled: true },
        label: { enabled: true, placement: 'top', fontWeight: 'bold' },
      },
    ],
    legend: { enabled: false },
  };
}
