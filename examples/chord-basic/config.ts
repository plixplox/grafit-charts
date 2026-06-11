import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Calls between services' },
    series: [{ type: 'chord', fromField: 'from', toField: 'to', sizeField: 'calls' }],
    legend: { enabled: false },
  };
}
