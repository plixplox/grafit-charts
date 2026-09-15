import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Visits this week' },
    series: [{ type: 'area', xField: 'day', yField: 'visits', name: 'Visits', fillOpacity: 0.2, marker: { showOn: 'hover', size: 8 } }],
  };
}
