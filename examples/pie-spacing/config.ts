import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Pie with spacing and rounded corners' },
    series: [
      {
        type: 'pie',
        angleField: 'share',
        angleName: 'Share, %',
        labelField: 'device',
        sectorSpacing: 3,
        cornerRadius: 7,
        sectorLabel: { enabled: true },
      },
    ],
  };
}
