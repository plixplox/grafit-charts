import { WaterfallSeries, type WaterfallItemStylerParams, type WaterfallSeriesOptions } from './index';
import type { LayoutRect, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Rect } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'waterfall-0',
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
  { step: 'Sales', value: 10 },
  { step: 'Costs', value: -4 },
  { step: 'Net', value: 0 },
];

function render(options: Partial<WaterfallSeriesOptions>): { waterfall: WaterfallSeries; rects: Rect[] } {
  const layer = new Group();
  const waterfall = new WaterfallSeries({ type: 'waterfall', xField: 'step', yField: 'value', totals: [2], ...options }, env);
  waterfall.update({
    data,
    xScale: new BandScale(
      data.map((datum) => datum.step),
      [plot.x, plot.x + plot.width],
    ),
    yScale: new LinearScale([0, 10], [plot.y + plot.height, plot.y]),
    swapped: false,
    plot,
    layer,
    measureText: (text: string) => text.length * 10,
  });
  const rects: Rect[] = [];
  const walk = (node: { children?: unknown[] }) => {
    for (const child of node.children ?? []) {
      if (child instanceof Rect) rects.push(child);
      else walk(child as { children?: unknown[] });
    }
  };
  walk(layer as unknown as { children?: unknown[] });
  return { waterfall, rects };
}

describe('item styler', () => {
  it('is told the kind of each step and the fill that kind has', () => {
    const seen: Array<[WaterfallItemStylerParams['kind'], unknown]> = [];
    render({ itemStyler: ({ kind, fill }) => void seen.push([kind, fill]) });
    expect(seen).toEqual([
      ['positive', '#436ff4'],
      ['negative', '#e5484d'],
      ['total', '#888'],
    ]);
  });

  it('paints over the fill of the kind, and the tooltip follows', () => {
    const { rects, waterfall } = render({ itemStyler: ({ index }) => (index === 1 ? { fill: '#000' } : undefined) });
    expect(rects.map((rect) => rect.fill)).toEqual(['#436ff4', '#000', '#888']);
    expect(waterfall.tooltipFor(1).rows[0]?.color).toBe('#000');
  });
});
