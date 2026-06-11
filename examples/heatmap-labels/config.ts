import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Value labels' },
    series: [
      {
        type: 'heatmap',
        xField: 'week',
        yField: 'day',
        colorField: 'deploys',
        colorName: 'Deploys',
        // text color is chosen automatically based on cell luminance
        label: { enabled: true },
      },
    ],
    // tooltip at the cell center
    tooltip: { position: { anchorTo: 'center' } },
    legend: { enabled: false },
  };
}
