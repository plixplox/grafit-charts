import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// Overlay compares the shapes, so each group is a percentage of itself —
// otherwise the smaller sample would read as the flatter distribution.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Session duration by plan' },
    subtitle: { text: 'groupMode: overlay, each group as % of itself' },
    series: [
      {
        type: 'histogram',
        xField: 'duration',
        groupField: 'plan',
        groupMode: 'overlay',
        normalize: 'percent',
        binWidth: 10,
      },
    ],
  };
}
