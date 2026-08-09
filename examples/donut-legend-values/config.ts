import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Values in the legend' },
    series: [
      {
        type: 'donut',
        angleField: 'amount',
        labelField: 'source',
        innerRadiusRatio: 0.62,
        sectorSpacing: 3,
        cornerRadius: 4,
        label: { enabled: false },
        innerLabels: [
          { text: 'Total', fontSize: 13 },
          { text: '$86K', fontSize: 24, fontWeight: 'bold' },
        ],
        legendValue: {
          enabled: true,
          formatter: ({ value }) => `$${value}K`,
        },
      },
    ],
    legend: { position: 'right' },
    tooltip: { position: { anchorTo: 'pointer', yOffset: -8 } },
  };
}
