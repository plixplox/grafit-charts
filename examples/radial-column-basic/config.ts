import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Sales by quarter' },
    series: [
      { type: 'radial-column', angleField: 'quarter', radiusField: 'online', name: 'Online' },
      { type: 'radial-column', angleField: 'quarter', radiusField: 'offline', name: 'Offline' },
    ],
  };
}
