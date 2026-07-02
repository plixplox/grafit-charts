import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// Left-aligned title on top, a footnote-style subtitle at the bottom right.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Weekly sessions', textAlign: 'left', spacing: 12 },
    subtitle: { text: 'updated hourly', textAlign: 'right', position: 'bottom' },
    series: [{ type: 'area', xField: 'day', yField: 'sessions', name: 'Sessions' }],
    legend: { enabled: false },
  };
}
