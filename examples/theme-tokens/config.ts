import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Design tokens' },
    subtitle: { text: 'one theme, every mark follows' },
    series: [
      { type: 'bar', xField: 'month', yField: 'north', name: 'North' },
      { type: 'line', xField: 'month', yField: 'south', name: 'South', marker: { enabled: true } },
    ],
    theme: {
      baseTheme: 'vibrant',
      params: {
        // one value each, applied across every series type at once
        fontSize: 12,
        strokeWidth: 3,
        cornerRadius: 6,
        fillOpacity: 0.5,
      },
      axis: { tick: true, gridDash: [] },
    },
  };
}
