import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Company structure' },
    series: [{ type: 'pyramid', stageField: 'level', valueField: 'count', name: 'People' }],
    legend: { enabled: false },
  };
}
