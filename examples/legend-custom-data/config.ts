import { getData } from './data';
import type { ChartOptions, LegendItemOptions } from 'grafit-charts';

// Custom legend items describe the bar statuses of a Gantt-style range-bar —
// something the auto-derived per-series legend cannot show.
const STATUS_COLORS: Record<string, string> = {
  done: '#22c55e',
  running: '#3b82f6',
  failed: '#ef4444',
  queued: '#94a3b8',
};

export function createOptions(): ChartOptions {
  const data = getData();
  const countOf = (status: string) => String(data.filter((datum) => datum.status === status).length);
  const legendItem = (status: string, name: string): LegendItemOptions => ({
    name,
    marker: { color: STATUS_COLORS[status] },
    value: countOf(status),
  });
  return {
    data,
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
    legend: {
      data: [
        legendItem('done', 'Done'),
        legendItem('running', 'Running'),
        { ...legendItem('failed', 'Failed'), marker: { color: STATUS_COLORS.failed, size: 12 }, label: { fontWeight: 'bold', color: '#ef4444' } },
        legendItem('queued', 'Queued'),
      ],
    },
  };
}
