import { RadarLineSeries, type RadarLineSeriesOptions } from './index';
import type { PolarRenderContext, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Marker, Path, Text } from '@/shared/scene';
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
    palette: { fills: ['#436ff4', '#21a06c', '#e5484d'], strokes: ['#2f56cc'], sequential: ['#dbe6ff', '#1d4fd7'] },
    axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
  },
};

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
  { skill: 'Speed', level: 2 },
  { skill: 'Power', level: 9 },
  { skill: 'Range', level: 6 },
];

function render(options: Partial<RadarLineSeriesOptions>, extra: Partial<PolarRenderContext> = {}) {
  const layer = new Group();
  const series = new RadarLineSeries({ type: 'radar-line', angleField: 'skill', radiusField: 'level', ...options }, env);
  series.setData(data);
  series.update({
    data,
    centerX: 150,
    centerY: 150,
    radius: 100,
    area: { x: 0, y: 0, width: 300, height: 300 },
    measureText: (text: string) => text.length * 10,
    layer,
    angleScale: new BandScale(
      data.map((datum) => datum.skill),
      [0, Math.PI * 2],
    ),
    radiusScale: new LinearScale([0, 10], [0, 100]),
    ...extra,
  });
  return { series, markers: nodesOf(layer, Marker), paths: nodesOf(layer, Path), texts: nodesOf(layer, Text) };
}

const weak: NonNullable<RadarLineSeriesOptions['marker']>['itemStyler'] = ({ datum }) =>
  Number(datum.level) < 5 ? { fill: '#d64545', label: { color: '#d64545' } } : undefined;

describe('marker item styler', () => {
  it('paints the vertices it answers for and leaves the web the series color', () => {
    const { markers, paths, series } = render({ marker: { itemStyler: weak } });
    expect(markers.map((marker) => marker.fill)).toEqual(['#d64545', '#2f56cc', '#2f56cc']);
    expect(paths[0]?.stroke).toBe('#2f56cc');
    expect(series.tooltipFor(0).rows[0]?.color).toBe('#d64545');
    expect(series.legendItems()[0]?.color).toBe('#2f56cc');
  });

  it('grows a highlighted marker from its styled look', () => {
    const { markers } = render({ marker: { itemStyler: weak } }, { highlight: { seriesId: 'series-0', datumIndex: 0 } });
    expect(markers[0]?.fill).toBe('#d64545');
    expect(markers[0]?.size).toBeCloseTo(6 * 1.5, 6);
  });

  it('colours the label of a vertex, markers shown or not', () => {
    const { texts } = render({ marker: { enabled: false, itemStyler: weak }, label: { enabled: true } });
    expect(texts.map((text) => text.fill)).toEqual(['#d64545', '#111', '#111']);
  });
});
