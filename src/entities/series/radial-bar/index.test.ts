import { RadialBarSeries } from './index';
import type { SeriesEnv } from '@/shared/kernel';
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
  { team: 'A', score: 30 },
  { team: 'B', score: 80 },
];

describe('item styler', () => {
  it('paints the bars it answers for, and the tooltip follows', () => {
    const layer = new Group();
    const series = new RadialBarSeries(
      {
        type: 'radial-bar',
        angleField: 'team',
        radiusField: 'score',
        itemStyler: ({ datum }) => (Number(datum.score) < 50 ? { fill: '#d64545', fillOpacity: 0.5 } : undefined),
      },
      env,
    );
    series.setData(data);
    series.update({
      data,
      centerX: 150,
      centerY: 150,
      radius: 100,
      area: { x: 0, y: 0, width: 300, height: 300 },
      measureText: (text: string) => text.length * 10,
      layer,
      radiusBandScale: new BandScale(
        data.map((datum) => datum.team),
        [20, 100],
      ),
      angleValueScale: new LinearScale([0, 100], [0, Math.PI * 2]),
    });
    const sectors = nodesOf(layer, Sector);
    expect(sectors.map((sector) => sector.fill)).toEqual(['#d64545', '#436ff4']);
    expect(sectors[0]?.opacity).toBeCloseTo(0.5, 6);
    expect(series.tooltipFor(0).rows[0]?.color).toBe('#d64545');
  });
});
