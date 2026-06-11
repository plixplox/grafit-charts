import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Bin count' },
    subtitle: { text: 'binCount: 24 vs default auto' },
    series: [{ type: 'histogram', xField: 'response', name: 'Response time, ms', binCount: 24, fillOpacity: 0.8 }],
    legend: { enabled: false },
  };
}
