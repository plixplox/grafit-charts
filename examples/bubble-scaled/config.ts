import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Bubble Size Range' },
    subtitle: { text: 'size 8 → maxSize 46, translucent fill' },
    series: [
      {
        type: 'bubble',
        xField: 'effort',
        xName: 'Effort',
        yField: 'impact',
        yName: 'Impact',
        sizeField: 'team',
        sizeName: 'Team',
        name: 'Initiatives',
        size: 8,
        maxSize: 46,
        fillOpacity: 0.55,
      },
    ],
    legend: { enabled: false },
  };
}
