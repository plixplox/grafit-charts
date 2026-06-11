import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Sales funnel' },
    series: [{ type: 'bar', xField: 'stage', yField: 'count', name: 'Deals', cornerRadius: 6 }],
    legend: { enabled: false },
    // custom theme: palette + design tokens on top of a base theme
    theme: {
      baseTheme: 'dark',
      palette: { fills: ['#27c08d'] },
      params: {
        backgroundColor: '#0d1f1a',
        foregroundColor: '#d8f3e9',
        fontFamily: 'Georgia, serif',
      },
    },
  };
}
