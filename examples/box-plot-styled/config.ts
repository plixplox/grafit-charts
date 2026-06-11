import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Review Time by Sprint' },
    subtitle: { text: 'custom colors and whisker cap width' },
    series: [
      {
        type: 'box-plot',
        xField: 'sprint',
        minField: 'min',
        q1Field: 'q1',
        medianField: 'median',
        q3Field: 'q3',
        maxField: 'max',
        name: 'Hours',
        fill: '#9a7bff',
        fillOpacity: 0.45,
        stroke: '#6f5bd7',
        strokeWidth: 1.5,
        capLengthRatio: 0.4,
      },
    ],
    legend: { enabled: false },
  };
}
