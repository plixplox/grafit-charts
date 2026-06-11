import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Activation funnel' },
    series: [{ type: 'cone-funnel', stageField: 'stage', valueField: 'value', name: 'Users' }],
    legend: { enabled: false },
  };
}
