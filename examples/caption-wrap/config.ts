import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// Long captions wrap onto several lines and flow around the floating legend
// instead of running underneath it.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Site traffic by acquisition channel, twelve months to August', textAlign: 'left', padding: { bottom: 4 } },
    subtitle: { text: 'visits per month, thousands; organic includes search and referrals', textAlign: 'left', padding: { bottom: 12 } },
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
