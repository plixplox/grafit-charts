import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Traffic Sources' },
    subtitle: { text: 'thousands of visits, stacked' },
    series: [
      { type: 'bar', xField: 'year', yField: 'organic', name: 'Organic', stacked: true },
      { type: 'bar', xField: 'year', yField: 'ads', name: 'Ads', stacked: true },
      { type: 'bar', xField: 'year', yField: 'referral', name: 'Referrals', stacked: true },
    ],
  };
}
