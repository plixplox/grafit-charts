import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';
import { buildSparklineOptions } from 'grafit-charts';

// the same in an app: Charts.createSparkline({ container, data, field: 'value', type: 'bar' })
export function createOptions(): ChartOptions {
  return buildSparklineOptions({
    data: getData(),
    field: 'value',
    type: 'bar',
    height: 56,
  }) as ChartOptions;
}
