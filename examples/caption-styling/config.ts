import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// Custom caption fonts, colors and padding.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Annual revenue', fontSize: 22, fontWeight: 800, color: '#0f766e', padding: { bottom: 4 } },
    subtitle: { text: 'by quarter, $K', fontSize: 14, color: '#94a3b8', padding: { bottom: 16 } },
    series: [{ type: 'bar', xField: 'quarter', yField: 'revenue', name: 'Revenue' }],
    legend: { enabled: false },
  };
}
