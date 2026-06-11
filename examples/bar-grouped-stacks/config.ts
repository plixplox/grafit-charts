import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Revenue by Product Category' },
    subtitle: { text: '$B; two stacks per category' },
    series: [
      { type: 'bar', xField: 'quarter', yField: 'iphone', name: 'iPhone', stacked: true, stackGroup: 'Devices' },
      { type: 'bar', xField: 'quarter', yField: 'mac', name: 'Mac', stacked: true, stackGroup: 'Devices' },
      { type: 'bar', xField: 'quarter', yField: 'ipad', name: 'iPad', stacked: true, stackGroup: 'Devices' },
      { type: 'bar', xField: 'quarter', yField: 'wearables', name: 'Wearables', stacked: true, stackGroup: 'Other' },
      { type: 'bar', xField: 'quarter', yField: 'services', name: 'Services', stacked: true, stackGroup: 'Other' },
    ],
  };
}
