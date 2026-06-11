import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'User journey' },
    series: [{ type: 'sankey', fromField: 'from', toField: 'to', sizeField: 'value' }],
    legend: { enabled: false },
  };
}
