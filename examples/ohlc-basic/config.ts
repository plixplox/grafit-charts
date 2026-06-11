import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'OHLC bars' },
    series: [{ type: 'ohlc', xField: 'date', openField: 'open', highField: 'high', lowField: 'low', closeField: 'close' }],
    axes: [
      { type: 'ordinal-time', position: 'bottom' },
      { type: 'number', position: 'right' },
    ],
    legend: { enabled: false },
  };
}
