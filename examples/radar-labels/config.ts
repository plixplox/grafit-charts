import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Value labels on the vertices' },
    series: [
      { type: 'radar-area', angleField: 'skill', radiusField: 'target', name: 'Target' },
      {
        type: 'radar-line',
        angleField: 'skill',
        radiusField: 'current',
        name: 'Current',
        label: { enabled: true, fontWeight: 'bold' },
      },
    ],
  };
}
