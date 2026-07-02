import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// A floating legend anchored to the top-right corner of the whole chart —
// on the same level as the left-aligned title.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Site traffic', textAlign: 'left', spacing: 4 },
    subtitle: { text: 'visits per month, thousands', textAlign: 'left', spacing: 12 },
    series: [
      { type: 'line', xField: 'month', yField: 'organic', name: 'Organic' },
      { type: 'line', xField: 'month', yField: 'ads', name: 'Ads' },
    ],
    legend: {
      position: 'top-right',
      floating: true,
      background: { fill: 'rgba(255, 255, 255, 0.85)', stroke: '#cbd5e1', cornerRadius: 6, padding: 10 },
    },
  };
}
