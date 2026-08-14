import { getData, newServices, newValues, type Reading } from './data';
import type { ChartInstance, ChartOptions } from 'grafit-charts';

// Data replaced on demand: the bars walk to their new heights and the axis
// travels with them. `key` says what makes a bar the same bar between readings,
// so a service that drops out sinks away while the one taking its place grows in.
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Requests per minute' },
    series: [{ type: 'bar', xField: 'service', yField: 'requests', name: 'Requests', cornerRadius: 4 }],
    legend: { enabled: false },
    tooltip: {},
    animation: { key: 'service', updateDuration: 900 },
  };
}

// Buttons under the demo. The data of the chart is the state of the demo:
// each reading is built from the one on screen, so the bars drift rather than jump.
export const actions = [
  {
    label: 'New values',
    run: (chart: ChartInstance) => update(chart, newValues),
  },
  {
    label: 'New services',
    run: (chart: ChartInstance) => update(chart, newServices),
  },
];

function update(chart: ChartInstance, next: (previous: Reading[]) => Reading[]): void {
  const options = chart.getOptions();
  void chart.update({ ...options, data: next((options.data as Reading[]) ?? getData()) });
}
