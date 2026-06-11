import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

const rub = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Orders this week' },
    series: [
      {
        type: 'bar',
        xField: 'day',
        yField: 'orders',
        name: 'Orders',
        tooltip: {
          // renderer returns the tooltip structure; datum gives access to the whole data row
          renderer: ({ datum, yValue, color }) => ({
            heading: `${datum.day} — ${yValue} orders`,
            rows: [{ label: 'Revenue', value: rub.format(datum.revenue as number), color }],
          }),
        },
      },
    ],
    legend: { enabled: false },
  };
}
