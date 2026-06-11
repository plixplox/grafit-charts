import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Temperature range' },
    series: [{ type: 'range-area', xField: 'month', yLowField: 'min', yHighField: 'max', name: 'Min–Max, °C' }],
    legend: { enabled: false },
  };
}
