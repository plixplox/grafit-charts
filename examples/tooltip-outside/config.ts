import { getData } from './data';
import type { ChartInstance, ChartOptions } from 'grafit-charts';

const bareAxis = { label: { enabled: false }, line: { enabled: false }, tick: { enabled: false }, gridLine: { enabled: false } };

// A KPI strip in a tile that clips its content, as a dashboard card does. Inside
// the chart the tooltip is held within a strip shorter than itself and cut by the
// tile; in the body it clears the strip — over it, or under it with no room above.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    series: [
      {
        type: 'line',
        xField: 'month',
        yField: 'revenue',
        name: 'Revenue',
        marker: { showOn: 'hover' },
        tooltip: {
          renderer: ({ datum, color }) => ({
            heading: String(datum.month),
            rows: [{ label: 'Revenue', value: `${Number(datum.revenue).toFixed(2)} M`, color }],
          }),
        },
      },
    ],
    axes: [
      { type: 'category', position: 'bottom', paddingOuter: 0, ...bareAxis },
      { type: 'number', position: 'left', nice: false, ...bareAxis },
    ],
    legend: { enabled: false },
    // no floor under the measured size: the strip is exactly as short as its card
    minHeight: 0,
    padding: { top: 6, right: 8, bottom: 6, left: 8 },
    tooltip: { container: 'body', range: 'nearest' },
  };
}

// Buttons under the demo: the same strip with the tooltip in either home.
export const actions = [
  {
    label: 'Tooltip in the body',
    run: (chart: ChartInstance) => void chart.updateDelta({ tooltip: { container: 'body' } }),
  },
  {
    label: 'Tooltip inside the chart',
    run: (chart: ChartInstance) => void chart.updateDelta({ tooltip: { container: 'chart' } }),
  },
];
