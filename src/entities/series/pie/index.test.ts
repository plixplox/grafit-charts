import { PieSeries, type PieSeriesOptions } from './index';
import type { PolarRenderContext, SeriesEnv } from '@/shared/kernel';
import { Group, Text } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'pie-0',
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

const data = [
  { browser: 'Chrome', share: 60 },
  { browser: 'Safari', share: 40 },
];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

/** Text nodes the series draws, in drawing order. */
function labels(options: Partial<PieSeriesOptions>): Text[] {
  const series = new PieSeries({ type: 'pie', angleField: 'share', labelField: 'browser', ...options }, env);
  series.setData(data);
  const layer = new Group();
  const ctx: PolarRenderContext = {
    data,
    centerX: 200,
    centerY: 150,
    radius: 100,
    area: { x: 0, y: 0, width: 400, height: 300 },
    measureText,
    layer,
  };
  series.update(ctx);
  const found: Text[] = [];
  const walk = (node: { children?: unknown[] }) => {
    for (const child of node.children ?? []) {
      if (child instanceof Text) found.push(child);
      else walk(child as { children?: unknown[] });
    }
  };
  walk(layer as unknown as { children?: unknown[] });
  return found;
}

describe('sector labels', () => {
  it('shows the sector name and nothing else until the value is asked for', () => {
    expect(labels({}).map((node) => node.text)).toEqual(['Chrome', 'Safari']);
  });

  it('keeps the name and the value together, the value on its own line', () => {
    const texts = labels({ label: { value: { enabled: true } } }).map((node) => node.text);
    expect(texts).toEqual(['Chrome', '60%', 'Safari', '40%']);
  });

  it('draws an inline label as name, separator and value in a row', () => {
    const texts = labels({ label: { layout: 'inline', value: { enabled: true } } }).map((node) => node.text);
    expect(texts).toEqual(['Chrome', ' · ', '60%', 'Safari', ' · ', '40%']);
  });

  it('stacks the two parts, each with its own font and colour', () => {
    const [name, value] = labels({
      label: { category: { fontSize: 14, color: '#111' }, value: { enabled: true, fontSize: 10, color: '#888' } },
    });
    expect([name?.fontSize, name?.fill]).toEqual([14, '#111']);
    expect([value?.fontSize, value?.fill]).toEqual([10, '#888']);
    // the value sits under the name, both centred on the same anchor
    expect(value?.y).toBeGreaterThan(name?.y ?? 0);
  });

  it('reads the raw value when asked for it, through the format string', () => {
    const texts = labels({ label: { value: { enabled: true, type: 'value', format: ',.1f' } } }).map((node) => node.text);
    expect(texts).toEqual(['Chrome', '60.0', 'Safari', '40.0']);
  });

  it('hands the formatter the datum, the value and the share', () => {
    const texts = labels({
      label: {
        value: { enabled: true, formatter: ({ datum, value, share }) => `${datum.browser}: ${value} (${Math.round(share * 100)}%)` },
      },
    }).map((node) => node.text);
    expect(texts).toEqual(['Chrome', 'Chrome: 60 (60%)', 'Safari', 'Safari: 40 (40%)']);
  });

  it('drops the name when only the value was asked for', () => {
    const texts = labels({ label: { category: { enabled: false }, value: { enabled: true } } }).map((node) => node.text);
    expect(texts).toEqual(['60%', '40%']);
  });

  it('draws nothing at all with labels off', () => {
    expect(labels({ label: { enabled: false } })).toEqual([]);
  });
});
