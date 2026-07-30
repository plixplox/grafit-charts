import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Long category names' },
    subtitle: { text: 'the grid gives way to the labels instead of cutting them off' },
    series: [{ type: 'radar-area', angleField: 'metric', radiusField: 'score', name: 'Score', fillOpacity: 0.3 }],
    legend: { enabled: false },
  };
}
