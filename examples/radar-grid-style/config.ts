import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Cupping profile' },
    subtitle: { text: 'the rim is an outline, the web behind it is chrome' },
    series: [
      { type: 'radar-area', angleField: 'trait', radiusField: 'roast', name: 'Espresso roast', fillOpacity: 0.2 },
      { type: 'radar-line', angleField: 'trait', radiusField: 'filter', name: 'Filter roast' },
    ],
    axes: {
      angle: {
        // the outline of the web: its own stroke, its own width, solid
        line: { stroke: '#64748b', width: 1.5 },
        // the spokes are grid: dashed by the theme, and here a shade fainter
        gridLine: { opacity: 0.45 },
      },
      radius: {
        max: 10,
        ringCount: 5,
        // the vertical the ring values are read along — an outline of its own
        line: { stroke: '#94a3b8', width: 1.5 },
        label: { fontWeight: 'bold' },
      },
    },
  };
}
