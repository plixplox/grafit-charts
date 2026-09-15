/**
 * marker.showOn: 'hover' keeps line and area bare until a point is highlighted,
 * then draws the marker on that point alone.
 */
import { AreaSeries } from '@/entities/series/area';
import { LineSeries } from '@/entities/series/line';
import type { CartesianRenderContext, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Marker } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'series-0',
  colors: { fill: '#3b82f6', stroke: '#1d4ed8' },
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
    palette: { fills: ['#3b82f6'], strokes: ['#1d4ed8'], sequential: ['#dbe6ff', '#1d4fd7'] },
    axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
  },
};

const data = [
  { day: 'Mon', value: 2 },
  { day: 'Tue', value: 6 },
  { day: 'Wed', value: 4 },
];

function context(extra: Partial<CartesianRenderContext> = {}): CartesianRenderContext {
  return {
    data,
    xScale: new BandScale(['Mon', 'Tue', 'Wed'], [0, 300]),
    yScale: new LinearScale([0, 8], [200, 0]),
    swapped: false,
    plot: { x: 0, y: 0, width: 300, height: 200 },
    layer: new Group(),
    measureText: (text: string) => text.length * 10,
    ...extra,
  };
}

function markers(node: unknown): Marker[] {
  if (node instanceof Marker) return [node];
  return ((node as { children?: unknown[] }).children ?? []).flatMap(markers);
}

const seriesKinds = [
  ['line', (marker: object) => new LineSeries({ type: 'line', xField: 'day', yField: 'value', marker }, env)],
  ['area', (marker: object) => new AreaSeries({ type: 'area', xField: 'day', yField: 'value', marker }, env)],
] as const;

describe.each(seriesKinds)("marker.showOn: 'hover' (%s)", (_, create) => {
  it('draws no markers while nothing is highlighted', () => {
    const ctx = context();
    create({ showOn: 'hover' }).update(ctx);
    expect(markers(ctx.layer)).toHaveLength(0);
  });

  it('draws a single marker on the highlighted point', () => {
    const series = create({ showOn: 'hover' });
    const ctx = context({ highlight: { seriesId: series.id, datumIndex: 1 } });
    series.update(ctx);
    const drawn = markers(ctx.layer);
    expect(drawn).toHaveLength(1);
    expect(series.nodeAt(1)).toMatchObject({ x: drawn[0]!.x, y: drawn[0]!.y });
  });

  it('follows a shared tooltip that highlights every series', () => {
    const ctx = context({ highlight: { seriesId: 'other', datumIndex: 2, allSeries: true } });
    create({ showOn: 'hover' }).update(ctx);
    expect(markers(ctx.layer)).toHaveLength(1);
  });

  it('stays off when the marker is disabled outright', () => {
    const series = create({ showOn: 'hover', enabled: false });
    const ctx = context({ highlight: { seriesId: series.id, datumIndex: 1 } });
    series.update(ctx);
    expect(markers(ctx.layer)).toHaveLength(0);
  });
});

it('keeps selected points marked on a hover-only line', () => {
  const ctx = context({ selected: new Set([0, 2]), selectionActive: true });
  new LineSeries({ type: 'line', xField: 'day', yField: 'value', marker: { showOn: 'hover' } }, env).update(ctx);
  expect(markers(ctx.layer)).toHaveLength(2);
});
