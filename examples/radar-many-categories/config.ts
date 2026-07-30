import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Signups by week' },
    subtitle: { text: 'every spoke is drawn, only the labels with room to spare' },
    series: [{ type: 'radar-area', angleField: 'week', radiusField: 'signups', name: 'Signups', fillOpacity: 0.25 }],
    legend: { enabled: false },
  };
}
