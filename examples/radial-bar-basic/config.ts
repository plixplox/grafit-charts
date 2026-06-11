import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Team scores' },
    series: [{ type: 'radial-bar', angleField: 'team', radiusField: 'score', name: 'Score' }],
    legend: { enabled: false },
  };
}
