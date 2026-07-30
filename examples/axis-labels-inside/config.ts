import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Traffic by channel' },
    subtitle: { text: 'category labels sit above their bars' },
    series: [
      {
        type: 'bar',
        xField: 'channel',
        yField: 'share',
        name: 'Share',
        direction: 'horizontal',
        cornerRadius: 2,
        label: { enabled: true, placement: 'right', fontWeight: 'bold', formatter: ({ value }) => `${Math.round(value * 100)}%` },
      },
    ],
    axes: [
      {
        type: 'category',
        position: 'left',
        label: { placement: 'inside', fontWeight: 'bold', insideSpacing: 0, insideGap: 4 },
        line: { enabled: false },
      },
      {
        type: 'number',
        position: 'bottom',
        label: { format: '.0%' },
        gridLine: { lineDash: [2, 3] },
      },
    ],
    legend: { enabled: false },
  };
}
