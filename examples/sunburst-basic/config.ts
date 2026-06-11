import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Users by region' },
    subtitle: { text: 'millions, two levels' },
    series: [{ type: 'sunburst', labelField: 'label', sizeField: 'size' }],
    legend: { enabled: false },
  };
}
