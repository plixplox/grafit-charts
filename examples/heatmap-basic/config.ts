import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Load by hour' },
    series: [
      {
        type: 'heatmap',
        xField: 'day',
        yField: 'hour',
        colorField: 'load',
        colorName: 'Load',
        colorRange: ['#e8f0fe', '#1d4fd7'],
      },
    ],
    legend: { enabled: false },
  };
}
