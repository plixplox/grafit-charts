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
        // name and share read as one label, the share in its own smaller line
        label: { value: { enabled: true } },
      },
    ],
  };
}
