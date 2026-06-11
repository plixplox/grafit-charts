import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Session duration' },
    subtitle: { text: 'distribution, minutes' },
    series: [{ type: 'histogram', xField: 'duration', name: 'Sessions', binCount: 8 }],
    legend: { enabled: false },
  };
}
