import { ChordSeries, type ChordSeriesOptions } from './index';
import type { SeriesEnv } from '@/shared/kernel';
import { Group, Path, Sector } from '@/shared/scene';
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
  { from: 'A', to: 'B', size: 5 },
  { from: 'B', to: 'C', size: 3 },
];

describe('node styler', () => {
  it('paints a node by name, the ribbons out of it and its tooltip', () => {
    const layer = new Group();
    const options: ChordSeriesOptions = {
      type: 'chord',
      fromField: 'from',
      toField: 'to',
      sizeField: 'size',
      nodeStyler: ({ name, share }) => (name === 'B' ? { fill: '#6f5bd7' } : share > 0.25 ? undefined : { fill: '#999' }),
    };
    const series = new ChordSeries(options, env);
    series.setData(data);
    series.update({ data, plot: { x: 0, y: 0, width: 400, height: 400 }, layer, measureText: (text: string) => text.length * 6 });
    // A carries 5 of 16, B 8 of 16, C 3 of 16
    expect(nodesOf(layer, Sector).map((arc) => arc.fill)).toEqual(['#436ff4', '#6f5bd7', '#999']);
    expect(nodesOf(layer, Path).map((ribbon) => ribbon.fill)).toEqual(['#436ff4', '#6f5bd7']);
    expect(series.tooltipFor(1).rows[0]?.color).toBe('#6f5bd7');
  });
});
