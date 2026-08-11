import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Tile labels and gaps' },
    series: [
      {
        type: 'treemap',
        labelField: 'label',
        sizeField: 'size',
        itemGap: 3,
        groupGap: 10,
        groupHeader: { height: 22, fontSize: 13 },
        label: {
          enabled: true,
          placement: 'top-left',
          layout: 'inline',
          fontSize: 12,
          fontWeight: 'bold',
          value: { enabled: true, fontWeight: 'normal' },
        },
      },
    ],
    legend: { enabled: false },
  };
}
