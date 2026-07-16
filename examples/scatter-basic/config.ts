import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Height and weight' },
    series: [{ type: 'scatter', xField: 'height', xName: 'Height', yField: 'weight', yName: 'Weight', name: 'People' }],
    axes: [
      { type: 'number', position: 'bottom', title: { text: 'Height, cm' }, nice: false },
      { type: 'number', position: 'left', title: { text: 'Weight, kg' } },
    ],
    legend: { enabled: false },
  };
}
