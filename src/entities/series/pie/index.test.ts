import { PieSeries, type PieSeriesOptions } from './index';
import type { PolarRenderContext, SeriesEnv } from '@/shared/kernel';
import type { Datum } from '@/shared/options';
import { Group, Line, Text } from '@/shared/scene';
import { LabelPlacements } from '@/shared/util';
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

/** Nodes of the given kind the series draws, in drawing order. */
function render<T>(kind: abstract new (...args: never[]) => T, options: Partial<PieSeriesOptions>, rows: Datum[], areaHeight = 300): T[] {
  const series = new PieSeries({ type: 'pie', angleField: 'share', labelField: 'browser', ...options }, env);
  series.setData(rows);
  const layer = new Group();
  const ctx: PolarRenderContext = {
    data: rows,
    centerX: 200,
    centerY: 150,
    radius: 100,
    area: { x: 0, y: 0, width: 400, height: areaHeight },
    measureText,
    layer,
    labelGuard: new LabelPlacements(measureText),
  };
  series.update(ctx);
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

/** Text nodes the series draws, in drawing order. */
function labels(options: Partial<PieSeriesOptions>, rows: Datum[] = data, areaHeight = 300): Text[] {
  return render(Text, options, rows, areaHeight);
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

describe('callout lines', () => {
  /** Twelve equal sectors, rotated so that one of them points due right. */
  const wheel = Array.from({ length: 12 }, (_, index) => ({ browser: `Sector number ${index}`, share: 1 }));

  it('joins the radial segment to the tail', () => {
    // the two segments are one line: beside a sector at 3 or 9 o'clock no
    // radial length reaches a label the clustering has moved, and the segment
    // has to lean rather than leave the tail hanging
    const drawn = render(Line, { rotation: 75, label: { value: { enabled: true } } }, wheel);
    expect(drawn).toHaveLength(24);
    for (let index = 0; index < drawn.length; index += 2) {
      const radial = drawn[index];
      const tail = drawn[index + 1];
      expect([tail?.x1, tail?.y1]).toEqual([radial?.x2, radial?.y2]);
    }
  });
});

describe('sector labels that avoid overlap', () => {
  /** One sector of everything and a sliver of half a percent. */
  const sliver = [
    { browser: 'Chrome', share: 199 },
    { browser: 'Lynx', share: 1 },
  ];

  it('labels a sector however narrow it is, overlap and all', () => {
    expect(labels({}, sliver).map((node) => node.text)).toEqual(['Chrome', 'Lynx']);
    expect(labels({ label: { avoidOverlap: true } }, sliver).map((node) => node.text)).toEqual(['Chrome', 'Lynx']);
  });

  it('leaves a sector under minShare unlabelled, callout or inside', () => {
    // the sliver is half a percent of the total, the threshold is two
    expect(labels({ label: { minShare: 0.02 } }, sliver).map((node) => node.text)).toEqual(['Chrome']);
    expect(labels({ label: { minShare: 0.02, placement: 'inside' } }, sliver).map((node) => node.text)).toEqual(['Chrome']);
    // and it keeps its label right up to the threshold
    expect(labels({ label: { minShare: 0.005 } }, sliver).map((node) => node.text)).toEqual(['Chrome', 'Lynx']);
  });

  it('hands the rows of a crowded side to the widest sectors', () => {
    // 40px of height is two rows a side: 'Chrome' has the right side to itself,
    // and of the five on the left only the two widest keep their label
    const crowded = [
      { browser: 'Chrome', share: 40 },
      { browser: 'Safari', share: 30 },
      { browser: 'Edge', share: 12 },
      { browser: 'Firefox', share: 8 },
      { browser: 'Opera', share: 6 },
      { browser: 'Lynx', share: 4 },
    ];
    const texts = labels({ label: { avoidOverlap: true } }, crowded, 40).map((node) => node.text);
    expect(texts.sort()).toEqual(['Chrome', 'Edge', 'Safari']);
  });

  it('drops an inside label that runs into one already drawn', () => {
    // at 10px per character these two names are wider than the halves they sit
    // in, and both are centred on the same horizontal line
    const pair = [
      { browser: 'Chrome Canary Dev', share: 50 },
      { browser: 'Safari Technology', share: 50 },
    ];
    const inside: Partial<PieSeriesOptions> = { label: { placement: 'inside' } };
    // by default they simply overlap
    expect(labels(inside, pair).map((node) => node.text)).toEqual(['Chrome Canary Dev', 'Safari Technology']);
    expect(labels({ label: { ...inside.label, avoidOverlap: true } }, pair).map((node) => node.text)).toEqual(['Chrome Canary Dev']);
  });
});
