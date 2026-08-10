import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'A long tail of small sectors' },
    subtitle: { text: 'avoidOverlap hands out labels until the sides run out of rows' },
    legend: { enabled: false },
    series: [
      {
        type: 'donut',
        angleField: 'revenue',
        angleName: 'Revenue',
        labelField: 'brand',
        sectorSpacing: 4,
        cornerRadius: 6,
        // the sectors of the tail are slivers, and slivers still get drawn
        label: { avoidOverlap: true, value: { enabled: true, type: 'value', format: ',.0f' } },
      },
    ],
  };
}
