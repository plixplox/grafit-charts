import { LineSeries, type LineSeriesOptions } from './index';
import type { CartesianRenderContext, LayoutRect, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Marker, Path, Text } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'line-0',
  colors: { fill: '#436ff4', stroke: '#2f56cc' },
  theme: {
    backgroundColor: '#fff',
    foregroundColor: '#111',
    mutedColor: '#888',
    axisColor: '#ddd',
    fontFamily: 'sans-serif',
    fontSize: 11,
    strokeWidth: 2,
    positiveColor: '#21a06c',
    negativeColor: '#e5484d',
    palette: { fills: ['#436ff4'], strokes: ['#2f56cc'], sequential: ['#dbe6ff', '#1d4fd7'] },
    axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
  },
};

const plot: LayoutRect = { x: 0, y: 0, width: 400, height: 300 };
const data = [
  { month: 'Jan', revenue: -5 },
  { month: 'Feb', revenue: 10 },
];

/** Nodes of one kind a layer holds, in drawing order. */
function nodesOf<T>(layer: Group, kind: abstract new (...args: never[]) => T): T[] {
  const found: T[] = [];
  const walk = (node: { children?: unknown[] }) => {
    for (const child of node.children ?? []) {
      if (child instanceof kind) found.push(child);
      else walk(child as { children?: unknown[] });
    }
  };
  walk(layer as unknown as { children?: unknown[] });
  return found;
}

function render(options: Partial<LineSeriesOptions>, extra: Partial<CartesianRenderContext> = {}) {
  const layer = new Group();
  const line = new LineSeries({ type: 'line', xField: 'month', yField: 'revenue', ...options }, env);
  line.update({
    data,
    xScale: new BandScale(
      data.map((datum) => datum.month),
      [plot.x, plot.x + plot.width],
    ),
    yScale: new LinearScale([-5, 10], [plot.y + plot.height, plot.y]),
    swapped: false,
    plot,
    layer,
    measureText: (text: string) => text.length * 10,
    ...extra,
  });
  return { line, markers: nodesOf(layer, Marker), paths: nodesOf(layer, Path), texts: nodesOf(layer, Text) };
}

describe('marker item styler', () => {
  const itemStyler: NonNullable<LineSeriesOptions['marker']>['itemStyler'] = ({ datum }) =>
    Number(datum.revenue) < 0 ? { fill: '#d64545', label: { color: '#d64545' } } : undefined;

  it('paints the markers it answers for and leaves the line the series color', () => {
    const { markers, paths } = render({ marker: { itemStyler } });
    expect(markers.map((marker) => marker.fill)).toEqual(['#d64545', '#2f56cc']);
    expect(paths[0]?.stroke).toBe('#2f56cc');
  });

  it('grows a highlighted marker from its styled look', () => {
    const { markers } = render({ marker: { itemStyler } }, { highlight: { seriesId: 'line-0', datumIndex: 0 } });
    expect(markers[0]?.fill).toBe('#d64545');
    expect(markers[0]?.size).toBeCloseTo(7 * 1.5, 6);
  });

  it('colours the label of a point, markers shown or not', () => {
    const { texts, markers } = render({ marker: { enabled: false, itemStyler }, label: { enabled: true } });
    expect(markers).toHaveLength(0);
    expect(texts.map((text) => text.fill)).toEqual(['#d64545', '#111']);
  });

  it('gives the tooltip the color of the point and the legend the color of the series', () => {
    const { line } = render({ marker: { itemStyler } });
    expect(line.tooltipFor(0).rows[0]?.color).toBe('#d64545');
    expect(line.tooltipFor(1).rows[0]?.color).toBe('#2f56cc');
    expect(line.legendItems()[0]?.color).toBe('#2f56cc');
  });
});
