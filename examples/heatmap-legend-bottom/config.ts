import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Scale at the bottom with spacing' },
    series: [{ type: 'heatmap', xField: 'week', yField: 'day', colorField: 'deploys', colorName: 'Deploys' }],
    gradientLegend: { position: 'bottom', spacing: 14, thickness: 10 },
    legend: { enabled: false },
  };
}
