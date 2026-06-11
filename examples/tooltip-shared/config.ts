import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Shared tooltip' },
    subtitle: { text: "mode: 'shared' + range: 'nearest' — tooltip from anywhere" },
    series: [
      { type: 'line', xField: 'month', yField: 'plan', name: 'Plan' },
      { type: 'line', xField: 'month', yField: 'fact', name: 'Actual' },
      { type: 'line', xField: 'month', yField: 'forecast', name: 'Forecast', lineDash: [4, 3] },
    ],
    tooltip: { mode: 'shared', range: 'nearest' },
    crosshair: { enabled: true },
  };
}
