import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Navigator' },
    subtitle: { text: 'the window and handles below control the visible range' },
    series: [{ type: 'area', xField: 'date', yField: 'value', name: 'Metric' }],
    axes: [
      { type: 'time', position: 'bottom' },
      { type: 'number', position: 'left' },
    ],
    navigator: { enabled: true, min: 0.6, max: 1 },
    zoom: { enabled: true },
    legend: { enabled: false },
  };
}
