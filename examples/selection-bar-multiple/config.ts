import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Multiple: several bars' },
    subtitle: { text: 'clicks and box select accumulate the selection; clicking a selected bar deselects it' },
    series: [{ type: 'bar', xField: 'team', yField: 'tasks', name: 'Tasks' }],
    selection: { enabled: true, mode: 'multiple', boxSelect: true, inactiveOpacity: 0.35 },
    legend: { enabled: false },
  };
}
