import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Bubble with Inside Labels' },
    subtitle: { text: "placement: 'inside' — auto contrast and bubble-colored halo" },
    series: [
      {
        type: 'bubble',
        xField: 'reach',
        yField: 'engagement',
        sizeField: 'budget',
        sizeName: 'Budget',
        name: 'Channels',
        size: 22,
        maxSize: 58,
        fillOpacity: 0.8,
        label: {
          enabled: true,
          placement: 'inside',
          formatter: ({ datum }) => String(datum.channel),
        },
      },
    ],
    legend: { enabled: false },
  };
}
