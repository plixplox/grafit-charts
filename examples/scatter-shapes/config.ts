import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Marker shapes' },
    series: [
      { type: 'scatter', xField: 'x', yField: 'alpha', name: 'Group A', shape: 'circle' },
      { type: 'scatter', xField: 'x', yField: 'beta', name: 'Group B', shape: 'diamond' },
      { type: 'scatter', xField: 'x', yField: 'gamma', name: 'Group C', shape: 'triangle' },
    ],
  };
}
