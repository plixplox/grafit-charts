import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Lines of code by module' },
    series: [{ type: 'treemap', labelField: 'label', sizeField: 'size' }],
    legend: { enabled: false },
  };
}
