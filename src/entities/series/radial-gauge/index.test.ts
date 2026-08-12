import { RadialGaugeSeries, type RadialGaugeSeriesOptions } from './index';
import type { LayoutRect, SeriesEnv } from '@/shared/kernel';
import { Group, Line, Sector, Text } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'radial-gauge-0',
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

function render(options: Partial<RadialGaugeSeriesOptions>, rect: LayoutRect = plot): Group {
  const series = new RadialGaugeSeries({ type: 'radial-gauge', value: 67, ...options }, env);
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

describe('radial gauge', () => {
  it('centers what it draws in the plot instead of the circle it is a part of', () => {
    const layer = render({ label: { enabled: false } });
    const [arc] = nodesOf(layer, Sector) as [Sector];
    const [label] = nodesOf(layer, Text) as [Text];
    // an upright dial reaches its top at the arc and its bottom at the bound labels
    const top = arc.centerY - arc.outerRadius;
    const bottom = label.y + 11;
    expect(top - plot.y).toBeCloseTo(plot.y + plot.height - bottom, 0);
  });

  it('grows the dial into the room a full circle would have wasted', () => {
    const [arc] = nodesOf(render({ label: { enabled: false } }), Sector) as [Sector];
    // half the height would be 150 — the arc is not half a circle, so it beats that
    expect(arc.outerRadius).toBeGreaterThan(plot.height / 2);
  });

  it('keeps the whole dial inside a plot too narrow for it', () => {
    const narrow: LayoutRect = { x: 0, y: 0, width: 160, height: 300 };
    const [arc] = nodesOf(render({}, narrow), Sector) as [Sector];
    expect(arc.centerX - arc.outerRadius).toBeGreaterThanOrEqual(narrow.x);
    expect(arc.centerX + arc.outerRadius).toBeLessThanOrEqual(narrow.x + narrow.width);
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
    const layer = render({
      label: { fontSize: 30, color: '#f00', fontWeight: 'normal' },
      ticks: { fontSize: 9, color: '#0f0' },
    });
    const [label, tick] = nodesOf(layer, Text) as [Text, Text];
    expect([label.fontSize, label.fill, label.fontWeight]).toEqual([30, '#f00', 'normal']);
    expect([tick.fontSize, tick.fill]).toEqual([9, '#0f0']);
  });

  it('drops the bound labels when they are switched off', () => {
    expect(texts(render({ ticks: { enabled: false } }))).toEqual(['67']);
  });

  it('marks the target across the ring', () => {
    const layer = render({ target: 50, startAngle: -90, endAngle: 90, targetColor: '#f0f' });
    const [arc] = nodesOf(layer, Sector) as [Sector];
    const target = nodesOf(layer, Line).at(-1)!;
    // half of a scale spanning -90°..90° points straight up from the hub
    expect(target.x1).toBeCloseTo(arc.centerX, 6);
    expect(target.y2).toBeLessThan(arc.centerY - arc.innerRadius);
    expect(target.stroke).toBe('#f0f');
  });

  it('names the target in the tooltip', () => {
    const series = new RadialGaugeSeries({ type: 'radial-gauge', value: 67, target: 80 }, env);
    expect(series.tooltipFor().rows?.map((row) => row.label)).toEqual(['Value', 'Target']);
  });
});
