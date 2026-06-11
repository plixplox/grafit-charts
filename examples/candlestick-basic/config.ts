import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'CHRT / USD' },
    series: [{ type: 'candlestick', xField: 'date', openField: 'open', highField: 'high', lowField: 'low', closeField: 'close' }],
    axes: [
      { type: 'ordinal-time', position: 'bottom' },
      { type: 'number', position: 'right' },
    ],
    zoom: { enabled: true },
    crosshair: { enabled: true },
    legend: { enabled: false },
  };
}
