import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Revenue by quarter' },
    subtitle: { text: '$B, three levels on the axis: year → half → quarter' },
    series: [{ type: 'bar', xField: 'period', yField: 'revenue', name: 'Revenue', cornerRadius: 2 }],
    axes: [
      {
        type: 'grouped-category',
        position: 'bottom',
        // the formatter gets the raw level value: the halves arrive as 1 and 2
        groupLabel: { formatter: ({ value, level }) => (level === 0 ? `FY ${String(value)}` : `H${String(value)}`) },
      },
      { type: 'number', position: 'left', label: { format: '$,d' } },
    ],
    legend: { enabled: false },
  };
}
