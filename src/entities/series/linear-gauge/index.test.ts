import { LinearGaugeSeries, type LinearGaugeSeriesOptions } from './index';
import type { LayoutRect, SeriesEnv } from '@/shared/kernel';
import { Group, Line, Rect, Text } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'linear-gauge-0',
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
    palette: { fills: ['#436ff4', '#21a06c'], strokes: ['#2f56cc'], sequential: ['#dbe6ff', '#1d4fd7'] },
    axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
  },
};

const plot: LayoutRect = { x: 0, y: 0, width: 400, height: 300 };
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function render(options: Partial<LinearGaugeSeriesOptions>, rect: LayoutRect = plot): Group {
  const series = new LinearGaugeSeries({ type: 'linear-gauge', value: 40, ...options }, env);
  const layer = new Group();
  series.update({ data: [], plot: rect, layer, measureText });
  return layer;
}

function nodesOf<T>(layer: Group, kind: new () => T): T[] {
  const found: T[] = [];
  const walk = (node: { children?: unknown[] }): void => {
    for (const child of node.children ?? []) {
      if (child instanceof kind) found.push(child);
      else walk(child as { children?: unknown[] });
    }
  };
  walk(layer as unknown as { children?: unknown[] });
  return found;
}

const texts = (layer: Group): string[] => nodesOf(layer, Text).map((node) => node.text);

describe('linear gauge', () => {
  it('centers the value, the bar and the bounds as one block', () => {
    const layer = render({});
    const [track] = nodesOf(layer, Rect) as [Rect];
    const [label, tick] = nodesOf(layer, Text) as [Text, Text];
    const top = label.y - label.fontSize;
    const bottom = tick.y + tick.fontSize;
    expect(top - plot.y).toBeCloseTo(plot.y + plot.height - bottom, 0);
    expect(track.height).toBeGreaterThan(16);
  });

  it('keeps the thickness it was given', () => {
    const [track] = nodesOf(render({ thickness: 12 }), Rect) as [Rect];
    expect(track.height).toBe(12);
  });

  it('fills a vertical bar from the bottom up', () => {
    const layer = render({ orientation: 'vertical', value: 25, thickness: 20 });
    const [track, bar] = nodesOf(layer, Rect) as [Rect, Rect];
    expect([bar.width, track.width]).toEqual([20, 20]);
    expect(bar.height).toBeCloseTo(track.height * 0.25, 6);
    expect(bar.y + bar.height).toBeCloseTo(track.y + track.height, 6);
  });

  it('stands the bounds of a vertical scale beside the bar, max at the top', () => {
    const layer = render({ orientation: 'vertical', scale: { min: 0, max: 100 } });
    const [track] = nodesOf(layer, Rect) as [Rect];
    const [min, max] = nodesOf(layer, Text).slice(1) as [Text, Text];
    expect(min.x).toBeGreaterThan(track.x + track.width);
    expect(max.y).toBeLessThan(min.y);
    expect(min.textAlign).toBe('left');
  });

  it('paints the track in segments and rides the value over them', () => {
    const layer = render({
      thickness: 20,
      segments: [
        { to: 60, color: '#21a06c' },
        { to: 100, color: '#e5484d' },
      ],
    });
    const rects = nodesOf(layer, Rect) as [Rect, Rect, Rect];
    expect(rects.map((rect) => rect.fill)).toEqual(['#21a06c', '#e5484d', '#436ff4']);
    expect(rects[0].width).toBeCloseTo(plot.width * 0.6, 6);
    // the bullet bar is thinner than the ranges it reads against, and centered on them
    expect(rects[2].height).toBeLessThan(20);
    expect(rects[2].y + rects[2].height / 2).toBeCloseTo(rects[0].y + 10, 6);
  });

  it('formats the bounds of the scale and the value with their own formatters', () => {
    const layer = render({
      value: 15_000_000,
      scale: { min: 0, max: 20_000_000 },
      label: { formatter: (value) => `${value / 1e6}M` },
      ticks: { formatter: (value) => `${value / 1e6} mln` },
    });
    expect(texts(layer)).toEqual(['15M', '0 mln', '20 mln']);
  });

  it('takes the font and the color of both the value and the bounds', () => {
    const layer = render({ label: { fontSize: 30, color: '#f00' }, ticks: { fontSize: 9, color: '#0f0' } });
    const [label, tick] = nodesOf(layer, Text) as [Text, Text];
    expect([label.fontSize, label.fill]).toEqual([30, '#f00']);
    expect([tick.fontSize, tick.fill]).toEqual([9, '#0f0']);
  });

  it('marks the target across a vertical bar', () => {
    const layer = render({ orientation: 'vertical', target: 75, targetColor: '#f0f' });
    const [track] = nodesOf(layer, Rect) as [Rect];
    const [target] = nodesOf(layer, Line) as [Line];
    expect(target.y1).toBeCloseTo(track.y + track.height * 0.25, 6);
    expect(target.y1).toBe(target.y2);
    expect(target.stroke).toBe('#f0f');
  });
});
