import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Shared tooltip on a radar' },
    subtitle: { text: "mode: 'shared' — every measure of the spoke under the cursor" },
    series: [
      { type: 'radar-line', angleField: 'metric', radiusField: 'alpha', name: 'Alpha' },
      { type: 'radar-line', angleField: 'metric', radiusField: 'beta', name: 'Beta' },
      { type: 'radar-line', angleField: 'metric', radiusField: 'gamma', name: 'Gamma' },
    ],
    tooltip: { mode: 'shared' },
  };
}
