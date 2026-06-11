import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Custom sector tooltip' },
    series: [
      {
        type: 'donut',
        angleField: 'visits',
        labelField: 'channel',
        innerRadiusRatio: 0.55,
        tooltip: {
          renderer: ({ datum, color }) => ({
            heading: String(datum.channel),
            rows: [
              { label: 'Visits', value: String(datum.visits), color },
              { label: 'Conversion', value: `${datum.conversion}%` },
            ],
          }),
        },
      },
    ],
    legend: { enabled: false },
  };
}
