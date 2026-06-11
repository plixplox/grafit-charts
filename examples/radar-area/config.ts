import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Radar-area: profile comparison' },
    series: [
      { type: 'radar-area', angleField: 'metric', radiusField: 'team', name: 'Us', fillOpacity: 0.3 },
      { type: 'radar-area', angleField: 'metric', radiusField: 'market', name: 'Market', fillOpacity: 0.3 },
    ],
  };
}
