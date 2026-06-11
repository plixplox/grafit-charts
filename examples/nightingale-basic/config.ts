import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Incidents by month' },
    series: [{ type: 'nightingale', angleField: 'month', radiusField: 'incidents', name: 'Incidents', fillOpacity: 0.7 }],
    legend: { enabled: false },
  };
}
