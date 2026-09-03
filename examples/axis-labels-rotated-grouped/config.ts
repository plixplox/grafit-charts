import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Revenue by team' },
    subtitle: { text: '$M per quarter — every team keeps its name, and the separators lean with them' },
    series: [{ type: 'bar', xField: 'team', yField: 'revenue', name: 'Revenue', cornerRadius: 2 }],
    axes: [
      {
        type: 'grouped-category',
        position: 'bottom',
        // a tilted name ends at its own tick, so it is never read as the quarter next door's
        label: { rotation: -45, formatter: ({ value }) => String((value as string[])[1]).replace(/ Q\d$/, '') },
      },
      { type: 'number', position: 'left', label: { format: '$,d' } },
    ],
    legend: { enabled: false },
  };
}
