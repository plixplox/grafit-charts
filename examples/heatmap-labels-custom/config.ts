import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Custom labels' },
    subtitle: { text: 'formatter, font and color; scale disabled' },
    series: [
      {
        type: 'heatmap',
        xField: 'week',
        yField: 'day',
        colorField: 'deploys',
        colorRange: ['#fef3e2', '#e8590c'],
        itemPadding: 4,
        cornerRadius: 8,
        label: {
          enabled: true,
          placement: 'top-left',
          formatter: ({ value }) => `${value}×`,
          fontSize: 13,
          fontWeight: 'bold',
        },
      },
    ],
    gradientLegend: { enabled: false },
    legend: { enabled: false },
  };
}
