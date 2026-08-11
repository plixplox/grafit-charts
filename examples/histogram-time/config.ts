import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Revenue by month' },
    subtitle: { text: 'Rows of orders, collapsed into calendar months by the chart' },
    series: [
      {
        type: 'histogram',
        xField: 'placedAt',
        yField: 'amount',
        binWidth: 'month',
        aggregation: 'sum',
        groupField: 'channel',
        groupMode: 'stacked',
      },
    ],
    axes: [
      { type: 'time', position: 'bottom' },
      { type: 'number', position: 'left', title: { text: '₽' } },
    ],
    legend: { position: 'bottom' },
  };
}
