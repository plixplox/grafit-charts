import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Revenue by year and month' },
    subtitle: { text: 'a column of twelve nodes still fits the height' },
    series: [{ type: 'sankey', fromField: 'year', toField: 'month', sizeField: 'revenue', node: { spacing: 8 } }],
  };
}
