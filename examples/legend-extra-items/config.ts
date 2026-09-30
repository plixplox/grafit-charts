import { getData } from './data';
import type { BarSeriesOptions, ChartOptions } from 'grafit-charts';

// A conditional rule repaints bars across every series — the legend keeps the
// series items and gains one more for the colour the rule paints with.
const THRESHOLD = 10;
const ALERT = '#dc2626';

const STATUSES = [
  ['pending', 'Pending'],
  ['delivered', 'Delivered'],
  ['paid', 'Paid'],
  ['cancelled', 'Cancelled'],
] as const;

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Orders by Segment' },
    subtitle: { text: `revenue, $M; over ${THRESHOLD}M in red` },
    series: STATUSES.map(
      ([field, name]): BarSeriesOptions => ({
        type: 'bar',
        xField: 'segment',
        yField: field,
        name,
        itemStyler: ({ datum }) => (Number(datum[field]) > THRESHOLD ? { fill: ALERT } : undefined),
      }),
    ),
    legend: {
      extraItems: [{ name: `> ${THRESHOLD}M`, marker: { color: ALERT, shape: 'diamond' }, label: { fontWeight: 'bold' } }],
    },
  };
}
