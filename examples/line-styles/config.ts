import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Line and marker styles' },
    series: [
      { type: 'line', xField: 'month', yField: 'fact', name: 'Actual', strokeWidth: 2.5, marker: { shape: 'circle' } },
      { type: 'line', xField: 'month', yField: 'plan', name: 'Plan', lineDash: [6, 4], marker: { enabled: false } },
      {
        type: 'line',
        xField: 'month',
        yField: 'lastYear',
        name: 'Last year',
        stroke: '#9aa1ad',
        lineDash: [2, 3],
        marker: { shape: 'diamond', size: 6 },
      },
    ],
    tooltip: { mode: 'shared', range: 'nearest' },
    crosshair: { enabled: true },
  };
}
