import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Overlapping Areas' },
    subtitle: { text: 'fillOpacity + shared tooltip' },
    series: [
      { type: 'area', xField: 'hour', yField: 'desktop', name: 'Desktop', fillOpacity: 0.35 },
      { type: 'area', xField: 'hour', yField: 'mobile', name: 'Mobile', fillOpacity: 0.35 },
    ],
    tooltip: { mode: 'shared', range: 'nearest' },
  };
}
