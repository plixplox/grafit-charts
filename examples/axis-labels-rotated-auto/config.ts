import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Building permits by district' },
    subtitle: { text: 'the axis picks the angle: level while the names fit, tilted the moment one would not' },
    series: [{ type: 'bar', xField: 'district', yField: 'permits', name: 'Permits', cornerRadius: 2 }],
    axes: [
      { type: 'category', position: 'bottom', label: { rotation: 'auto' } },
      { type: 'number', position: 'left' },
    ],
    legend: { enabled: false },
  };
}
