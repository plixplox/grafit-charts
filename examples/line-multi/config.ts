import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Sessions by platform' },
    series: [
      { type: 'line', xField: 'quarter', yField: 'mobile', name: 'Mobile' },
      { type: 'line', xField: 'quarter', yField: 'desktop', name: 'Desktop' },
      {
        type: 'line',
        xField: 'quarter',
        yField: 'tablet',
        name: 'Tablet',
        lineDash: [4, 3],
        marker: { shape: 'diamond' },
      },
    ],
  };
}
