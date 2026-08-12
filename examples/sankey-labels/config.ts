import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Budget flow' },
    subtitle: { text: 'the name and the total of a node, each with its own font' },
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
          // the name and the number are one label, styled apart
          category: { fontWeight: 'bold' },
          value: { enabled: true, format: ',.0f', fontSize: 11, color: '#8892a4' },
        },
      },
    ],
    legend: { enabled: false },
  };
}
