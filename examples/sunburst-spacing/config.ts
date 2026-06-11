import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Sector spacing and corner radius' },
    series: [
      {
        type: 'sunburst',
        labelField: 'label',
        sizeField: 'size',
        sectorSpacing: 4,
        cornerRadius: 5,
      },
    ],
    legend: { enabled: false },
  };
}
