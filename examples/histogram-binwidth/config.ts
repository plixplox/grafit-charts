import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Bin width' },
    subtitle: { text: 'binWidth: 25 — bins start at multiples of 25' },
    series: [{ type: 'histogram', xField: 'response', name: 'Response time, ms', binWidth: 25, fillOpacity: 0.8 }],
    legend: { enabled: false },
  };
}
