import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

// Colour each task bar by its status — a Gantt-style timeline from a single range-bar series.
const STATUS_COLORS: Record<string, string> = {
  done: '#22c55e',
  running: '#3b82f6',
  failed: '#ef4444',
  queued: '#94a3b8',
};

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Pipeline run' },
    subtitle: { text: 'task timeline, hours' },
    series: [
      {
        type: 'range-bar',
        xField: 'task',
        yLowField: 'start',
        yHighField: 'end',
        direction: 'horizontal',
        cornerRadius: 3,
        fill: ({ datum }) => STATUS_COLORS[String(datum.status)] ?? '#94a3b8',
      },
    ],
    legend: { enabled: false },
  };
}
