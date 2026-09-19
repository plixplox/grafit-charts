import { SankeySeries, type SankeySeriesOptions } from './index';
import type { FlowNodeStylerParams } from '@/entities/series/base';
import type { SeriesEnv } from '@/shared/kernel';
import { Group, Path, Rect, Text } from '@/shared/scene';
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
  { from: 'Ads', to: 'Site', size: 30 },
  { from: 'Mail', to: 'Site', size: 10 },
  { from: 'Site', to: 'Order', size: 25 },
];

function render(options: Partial<SankeySeriesOptions>) {
  const layer = new Group();
  const series = new SankeySeries({ type: 'sankey', fromField: 'from', toField: 'to', sizeField: 'size', ...options }, env);
  series.setData(data);
  series.update({ data, plot: { x: 0, y: 0, width: 400, height: 300 }, layer, measureText: (text: string) => text.length * 6 });
  return { series, nodes: nodesOf(layer, Rect), links: nodesOf(layer, Path), texts: nodesOf(layer, Text) };
}

describe('node styler', () => {
  it('is told each node by name, with its column, its flow and its palette color', () => {
    const seen: Array<Partial<FlowNodeStylerParams>> = [];
    render({ nodeStyler: ({ name, depth, total, fill }) => void seen.push({ name, depth, total, fill }) });
    expect(seen).toEqual([
      { name: 'Ads', depth: 0, total: 30, fill: '#436ff4' },
      { name: 'Mail', depth: 0, total: 10, fill: '#21a06c' },
      { name: 'Site', depth: 1, total: 40, fill: '#e5484d' },
      { name: 'Order', depth: 2, total: 25, fill: '#436ff4' },
    ]);
  });

  it('paints a node by name, its links out and its tooltip with it', () => {
    const { nodes, links, texts, series } = render({
      nodeStyler: ({ name }) => (name === 'Site' ? { fill: '#6f5bd7', label: { color: '#6f5bd7' } } : undefined),
      label: { enabled: true },
    });
    expect(nodes[2]?.fill).toBe('#6f5bd7');
    // the link out of Site is the last one drawn
    expect(links.map((link) => link.fill)).toEqual(['#436ff4', '#21a06c', '#6f5bd7']);
    expect(texts.find((text) => text.text === 'Site')?.fill).toBe('#6f5bd7');
    expect(texts.find((text) => text.text === 'Ads')?.fill).toBe('#111');
    expect(series.tooltipFor(2).rows[0]?.color).toBe('#6f5bd7');
  });
});
