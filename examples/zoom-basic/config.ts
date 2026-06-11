import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Zoom and pan' },
    subtitle: { text: 'wheel/pinch — zoom, drag — select area, alt+drag — pan, dblclick — reset' },
    series: [{ type: 'line', xField: 'index', yField: 'value', name: 'Value', marker: { enabled: false } }],
    axes: [
      { type: 'number', position: 'bottom', nice: false },
      { type: 'number', position: 'left' },
    ],
    zoom: { enabled: true, dragSelect: true, panKey: 'alt' },
    contextMenu: { enabled: true },
    legend: { enabled: false },
  };
}
