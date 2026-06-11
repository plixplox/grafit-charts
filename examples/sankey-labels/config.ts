import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Budget flow' },
    subtitle: { text: 'labels with totals, wide nodes, dense links' },
    series: [
      {
        type: 'sankey',
        fromField: 'from',
        toField: 'to',
        sizeField: 'amount',
        node: { width: 14, spacing: 24 },
        linkOpacity: 0.5,
        label: {
          fontSize: 12,
          fontWeight: 'bold',
          formatter: ({ name, total }) => `${name} · ${total}K`,
        },
      },
    ],
    legend: { enabled: false },
  };
}
