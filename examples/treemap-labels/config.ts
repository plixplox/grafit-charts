import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Tile labels and padding' },
    series: [
      {
        type: 'treemap',
        labelField: 'label',
        sizeField: 'size',
        itemPadding: 5,
        label: {
          enabled: true,
          placement: 'top-left',
          formatter: ({ label, value }) => `${label} · ${value}`,
          fontSize: 12,
          fontWeight: 'bold',
        },
      },
    ],
    legend: { enabled: false },
  };
}
