import { CandlestickSeries, type CandlestickSeriesOptions } from './index';
import type { LayoutRect, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Line, Rect } from '@/shared/scene';
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
  { day: 'Mon', open: 10, high: 14, low: 9, close: 13, volume: 900 },
  { day: 'Tue', open: 13, high: 15, low: 11, close: 12, volume: 200 },
];

function render(options: Partial<CandlestickSeriesOptions>) {
  const layer = new Group();
  const series = new CandlestickSeries(
    {
      type: 'candlestick',
      xField: 'day',
      openField: 'open',
      highField: 'high',
      lowField: 'low',
      closeField: 'close',
      yField: '',
      ...options,
    },
    env,
  );
  series.update({
    data,
    xScale: new BandScale(
      data.map((datum) => datum.day),
      [plot.x, plot.x + plot.width],
    ),
    yScale: new LinearScale([8, 16], [plot.y + plot.height, plot.y]),
    swapped: false,
    plot,
    layer,
    measureText: (text: string) => text.length * 10,
  });
  return { series, bodies: nodesOf(layer, Rect), wicks: nodesOf(layer, Line) };
}

describe('item styler', () => {
  it('is told the direction and the prices of the session, and the fill of its direction', () => {
    const seen: unknown[] = [];
    render({ itemStyler: ({ up, open, close, fill }) => void seen.push([up, open, close, fill]) });
    expect(seen).toEqual([
      [true, 10, 13, '#21a06c'],
      [false, 13, 12, '#e5484d'],
    ]);
  });

  it('paints the candle over its direction, the wick following the fill', () => {
    const { bodies, wicks, series } = render({
      itemStyler: ({ datum }) => (Number(datum.volume) > 500 ? { fill: '#6f5bd7' } : undefined),
    });
    expect(bodies.map((body) => body.fill)).toEqual(['#6f5bd7', '#e5484d']);
    expect(wicks.map((wick) => wick.stroke)).toEqual(['#6f5bd7', '#e5484d']);
    expect(series.tooltipFor(0).rows[0]?.color).toBe('#6f5bd7');
  });

  it('keeps a stroke item names for the direction', () => {
    const { wicks } = render({ item: { up: { stroke: '#000' } }, itemStyler: () => ({ fill: '#6f5bd7' }) });
    expect(wicks[0]?.stroke).toBe('#000');
  });
});
