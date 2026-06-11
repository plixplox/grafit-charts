import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Product assessment' },
    series: [
      { type: 'radar-area', angleField: 'skill', radiusField: 'target', name: 'Target' },
      {
        type: 'radar-line',
        angleField: 'skill',
        radiusField: 'current',
        name: 'Current',
        tooltip: {
          renderer: ({ label, value, seriesName, color }) => ({
            heading: label,
            rows: [{ label: seriesName, value: `${value} / 10`, color }],
          }),
        },
      },
    ],
  };
}
