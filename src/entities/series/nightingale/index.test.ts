import { NightingaleSeries, type NightingaleSeriesOptions } from './index';
import type { PolarRenderContext, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Sector } from '@/shared/scene';
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
  { month: 'Jan', deaths: 12 },
  { month: 'Feb', deaths: 40 },
];

function render(options: Partial<NightingaleSeriesOptions>, extra: Partial<PolarRenderContext> = {}) {
  const layer = new Group();
  const series = new NightingaleSeries({ type: 'nightingale', angleField: 'month', radiusField: 'deaths', ...options }, env);
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
      data.map((datum) => datum.month),
      [0, Math.PI * 2],
    ),
    radiusScale: new LinearScale([0, 40], [0, 100]),
    ...extra,
  });
  return { series, sectors: nodesOf(layer, Sector) };
}

describe('item styler', () => {
  const deadly: NightingaleSeriesOptions['itemStyler'] = ({ datum }) => (Number(datum.deaths) > 20 ? { fill: '#d64545' } : undefined);

  it('paints the sectors it answers for, and the tooltip follows', () => {
    const { sectors, series } = render({ itemStyler: deadly });
    expect(sectors.map((sector) => sector.fill)).toEqual(['#436ff4', '#d64545']);
    expect(series.tooltipFor(1).rows[0]?.color).toBe('#d64545');
    expect(series.legendItems()[0]?.color).toBe('#436ff4');
  });

  it('keeps the styled color under the pointer, and the selection outline over it', () => {
    const { sectors } = render(
      { itemStyler: () => ({ fill: '#d64545', stroke: '#00ff00' }) },
      { highlight: { seriesId: 'series-0', datumIndex: 0 }, selected: new Set([1]), selectionStyle: { stroke: '#000' } },
    );
    expect(sectors[0]?.fill).toBe('#d64545');
    expect(sectors[0]?.stroke).toBe('#00ff00');
    expect(sectors[1]?.stroke).toBe('#000');
  });
});
