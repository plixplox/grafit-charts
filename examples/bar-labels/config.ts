import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Value Labels on Bars' },
    subtitle: { text: "outer ('top') and inner ('inner-top') placements" },
    series: [
      {
        type: 'bar',
        xField: 'team',
        yField: 'done',
        name: 'Done',
        label: { enabled: true, placement: 'inner-top', fontWeight: 'bold' },
      },
      {
        type: 'bar',
        xField: 'team',
        yField: 'planned',
        name: 'Plan',
        label: { enabled: true, placement: 'top' },
      },
    ],
  };
}
