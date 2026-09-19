import { SunburstSeries, type SunburstSeriesOptions } from './index';
import type { HierarchyItemStylerParams } from '@/entities/series/base';
import type { SeriesEnv, StandaloneRenderContext } from '@/shared/kernel';
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
  {
    label: 'Women',
    children: [
      { label: 'Dresses', size: 30 },
      { label: 'Shoes', size: 10 },
    ],
  },
  { label: 'Men', children: [{ label: 'Shirts', size: 20 }] },
];

function render(options: Partial<SunburstSeriesOptions>, extra: Partial<StandaloneRenderContext> = {}) {
  const layer = new Group();
  const series = new SunburstSeries({ type: 'sunburst', ...options }, env);
  series.setData(data);
  series.update({ data, plot: { x: 0, y: 0, width: 400, height: 400 }, layer, measureText: (text: string) => text.length * 6, ...extra });
  return { series, sectors: nodesOf(layer, Sector) };
}

describe('item styler', () => {
  it('is told every node, depth first, with its size and the color it inherits', () => {
    const seen: Array<Partial<HierarchyItemStylerParams>> = [];
    render({ itemStyler: ({ label, depth, value, leaf, fill }) => void seen.push({ label, depth, value, leaf, fill }) });
    expect(seen).toEqual([
      { label: 'Women', depth: 0, value: 40, leaf: false, fill: '#436ff4' },
      { label: 'Dresses', depth: 1, value: 30, leaf: true, fill: '#436ff4' },
      { label: 'Shoes', depth: 1, value: 10, leaf: true, fill: '#436ff4' },
      { label: 'Men', depth: 0, value: 20, leaf: false, fill: '#21a06c' },
      { label: 'Shirts', depth: 1, value: 20, leaf: true, fill: '#21a06c' },
    ]);
  });

  it('paints a branch and everything outside it; a leaf on its own', () => {
    const { sectors, series } = render({
      itemStyler: ({ label }) => (label === 'Women' ? { fill: '#e0569b' } : label === 'Shirts' ? { fill: '#000' } : undefined),
    });
    expect(sectors.map((sector) => sector.fill)).toEqual(['#e0569b', '#e0569b', '#e0569b', '#21a06c', '#000']);
    expect(series.tooltipFor(1).rows[0]?.color).toBe('#e0569b');
    expect(series.legendItems()[0]?.color).toBe('#436ff4');
  });

  it('lifts a hovered sector from its styled color', () => {
    const plain = render({ itemStyler: () => ({ fill: '#e0569b' }) }).sectors[1]?.fill;
    const hovered = render({ itemStyler: () => ({ fill: '#e0569b' }) }, { highlight: { seriesId: 'series-0', datumIndex: 1 } }).sectors[1]
      ?.fill;
    expect(plain).toBe('#e0569b');
    expect(hovered).not.toBe('#e0569b');
  });
});
