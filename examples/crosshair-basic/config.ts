import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Crosshair' },
    subtitle: { text: 'hover over the plot area' },
    series: [{ type: 'line', xField: 'month', yField: 'value', name: 'Value' }],
    crosshair: { enabled: true },
    legend: { enabled: false },
  };
}
