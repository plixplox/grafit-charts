import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Overrides: defaults per series type' },
    series: [
      { type: 'bar', xField: 'month', yField: 'desktop', name: 'Desktop' },
      { type: 'line', xField: 'month', yField: 'mobile', name: 'Mobile' },
    ],
    theme: {
      overrides: {
        common: { legend: { position: 'right' } },
        bar: { series: { cornerRadius: 8, fillOpacity: 0.8 } },
        line: { series: { strokeWidth: 3.5, lineDash: [12, 6], marker: { enabled: false } } },
      },
    },
  };
}
