import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// A five-pointed star in a 24×24 viewBox — the marker scales it to `size`.
const STAR = 'M12 2 L14.6 8.9 L21.8 9.3 L16.2 13.9 L18.1 21 L12 17 L5.9 21 L7.8 13.9 L2.2 9.3 L9.4 8.9 Z';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Delivery health' },
    subtitle: { text: 'per week' },
    series: [
      { type: 'bar', xField: 'week', yField: 'deploys', name: 'Deploys' },
      { type: 'line', xField: 'week', yField: 'failures', name: 'Failures', marker: { enabled: false } },
      { type: 'line', xField: 'week', yField: 'rollbacks', name: 'Rollbacks', lineDash: [5, 4] },
    ],
    legend: {
      item: { marker: { size: 12 }, gap: 22, markerGap: 8 },
      data: [
        // the bar keeps the default rounded square
        { name: 'Deploys', series: 'Deploys' },
        // a dash reads as a line the way the series draws it
        { name: 'Failures', series: 'Failures', marker: { shape: 'line', strokeWidth: 3 } },
        { name: 'Rollbacks', series: 'Rollbacks', marker: { shape: 'line', strokeWidth: 3, lineDash: [5, 4] } },
        // a static item with a custom glyph: SVG path data instead of a shape
        { name: 'SLO met', marker: { path: STAR, color: '#f59e0b' } },
      ],
    },
  };
}
