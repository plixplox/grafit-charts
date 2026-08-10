import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// One bin grid, two distributions on it: the default groupMode piles them up.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Session duration by plan' },
    subtitle: { text: 'groupField: plan — stacked' },
    series: [{ type: 'histogram', xField: 'duration', groupField: 'plan', binWidth: 10 }],
  };
}
