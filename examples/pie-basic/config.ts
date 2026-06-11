import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Browser share' },
    series: [
      {
        type: 'pie',
        angleField: 'share',
        angleName: 'Share, %',
        labelField: 'browser',
        sectorLabel: { enabled: true },
      },
    ],
  };
}
