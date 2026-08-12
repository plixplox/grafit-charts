import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Polar axes' },
    series: [{ type: 'nightingale', angleField: 'month', radiusField: 'incidents', name: 'Incidents', fillOpacity: 0.7 }],
    axes: {
      angle: {
        title: { text: 'Month' },
        gridLine: { lineDash: [3, 3], opacity: 0.5 },
        line: { stroke: '#64748b' },
      },
      radius: {
        title: { text: 'Incidents' },
        min: 0,
        max: 60,
        ringCount: 3,
        label: { format: ',.0f', fontWeight: 'bold' },
      },
    },
    legend: { enabled: false },
  };
}
