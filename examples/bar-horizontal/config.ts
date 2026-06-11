import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Languages in New Services' },
    subtitle: { text: '% of repositories' },
    series: [
      {
        type: 'bar',
        xField: 'language',
        yField: 'share',
        name: 'Share',
        direction: 'horizontal',
        cornerRadius: 3,
      },
    ],
    legend: { enabled: false },
  };
}
