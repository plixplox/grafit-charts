import { RangeAreaSeries, type RangeAreaSeriesOptions } from './index';
import type { CartesianRenderContext, LayoutRect, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Marker } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'series-0',
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

const data = [
  { month: 'Jan', low: -3, high: 4 },
  { month: 'Feb', low: 1, high: 9 },
];

function render(options: Partial<RangeAreaSeriesOptions>, extra: Partial<CartesianRenderContext> = {}) {
  const layer = new Group();
  const series = new RangeAreaSeries(
    { type: 'range-area', xField: 'month', yLowField: 'low', yHighField: 'high', yField: '', ...options },
    env,
  );
  series.update({
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
  return { series, markers: nodesOf(layer, Marker) };
}

const frost: RangeAreaSeriesOptions['marker'] = {
  enabled: true,
  itemStyler: ({ edge, low }) => (edge === 'low' && low < 0 ? { fill: '#3b82f6' } : undefined),
};

describe('markers', () => {
  it('are off by default', () => {
    expect(render({}).markers).toHaveLength(0);
  });

  it('stand on both edges, each styled on its own', () => {
    const { markers } = render({ marker: frost });
    expect(markers.map((marker) => marker.fill)).toEqual(['#436ff4', '#3b82f6', '#436ff4', '#436ff4']);
  });

  it('show on the highlighted datum alone with showOn hover, grown', () => {
    const { markers } = render({ marker: { showOn: 'hover' } }, { highlight: { seriesId: 'series-0', datumIndex: 1 } });
    expect(markers).toHaveLength(2);
    expect(markers[0]?.size).toBeCloseTo(7 * 1.5, 6);
  });

  it('give the tooltip the color of the high edge', () => {
    const { series } = render({ marker: { enabled: true, itemStyler: ({ edge }) => (edge === 'high' ? { fill: '#d64545' } : undefined) } });
    expect(series.tooltipFor(0).rows[0]?.color).toBe('#d64545');
  });
});
