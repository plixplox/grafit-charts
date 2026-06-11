import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Sector labels' },
    series: [
      {
        type: 'sunburst',
        labelField: 'label',
        sizeField: 'size',
        sectorSpacing: 2,
        label: {
          enabled: true,
          formatter: ({ label, value, depth }) => (depth === 0 ? label : `${label} · ${value}`),
        },
      },
    ],
    legend: { enabled: false },
  };
}
