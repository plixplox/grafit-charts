/**
 * A tile label is the name and the value of a node, put together the way a pie
 * sector's label is: each half with its own font and format, `layout` deciding
 * whether they share a row. What the scene ends up with is the check.
 */
import { TreemapSeries, type TreemapSeriesOptions } from './index';
import type { LayoutRect, SeriesEnv, TooltipContentData } from '@/shared/kernel';
import type { Datum } from '@/shared/options';
import { Group, Rect, Text } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'treemap-0',
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
const data: Datum[] = [
  { label: 'App', size: 60 },
  { label: 'Docs', size: 40 },
];
/** 6px per character — keeps the tiles wide enough for the expectations. */
const measureText = (text: string) => text.length * 6;

function series(options: Partial<TreemapSeriesOptions>): TreemapSeries {
  return new TreemapSeries({ type: 'treemap', labelField: 'label', sizeField: 'size', ...options }, env);
}

/** Text nodes the series drew, in drawing order — a label block is several of them. */
function labelNodes(options: Partial<TreemapSeriesOptions>, rows: Datum[] = data): Text[] {
  const instance = series(options);
  instance.setData(rows);
  const layer = new Group();
  instance.update({ data: rows, plot, layer, measureText });
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

/** The rectangles the series drew, in drawing order — headers before their children. */
function rectNodes(options: Partial<TreemapSeriesOptions>, rows: Datum[] = data): Rect[] {
  const instance = series(options);
  instance.setData(rows);
  const layer = new Group();
  instance.update({ data: rows, plot, layer, measureText });
  const found: Rect[] = [];
  const walk = (node: { children?: unknown[] }) => {
    for (const child of node.children ?? []) {
      if (child instanceof Rect) found.push(child);
      else walk(child as { children?: unknown[] });
    }
  };
  walk(layer as unknown as { children?: unknown[] });
  return found;
}

/** The runs of every label the series drew. */
function labels(options: Partial<TreemapSeriesOptions>, rows: Datum[] = data): string[] {
  return labelNodes(options, rows).map((node) => node.text);
}

/** Renders once so the tooltip has a context, then asks it about a node. */
function tooltip(datumIndex: number, options: Partial<TreemapSeriesOptions> = {}): TooltipContentData {
  const instance = series(options);
  instance.setData(data);
  instance.update({ data, plot, layer: new Group(), measureText });
  return instance.tooltipFor(datumIndex);
}

describe('tile labels', () => {
  it('prints the name only until the value half is asked for', () => {
    expect(labels({})).toEqual(['App', 'Docs']);
  });

  it('value.enabled adds the size as a run of its own', () => {
    expect(labels({ label: { value: { enabled: true } } })).toEqual(['App', '60', 'Docs', '40']);
  });

  it("value type 'percent' reads the size as a share of the chart total", () => {
    expect(labels({ label: { value: { enabled: true, type: 'percent' } } })).toEqual(['App', '60%', 'Docs', '40%']);
  });

  it('inline layout puts the separator between the halves', () => {
    expect(labels({ label: { layout: 'inline', separator: ' — ', value: { enabled: true } } })).toEqual([
      'App',
      ' — ',
      '60',
      'Docs',
      ' — ',
      '40',
    ]);
  });

  it('each half keeps its own font', () => {
    const nodes = labelNodes({
      label: { fontSize: 14, category: { fontWeight: 'bold' }, value: { enabled: true, fontSize: 10, color: '#abcdef' } },
    });
    expect(nodes[0]).toMatchObject({ text: 'App', fontSize: 14, fontWeight: 'bold' });
    expect(nodes[1]).toMatchObject({ text: '60', fontSize: 10, fill: '#abcdef' });
  });

  it('formats spell out both halves', () => {
    expect(
      labels({
        label: { category: { formatter: ({ label }) => label.toUpperCase() }, value: { enabled: true, format: ',.1f' } },
      }),
    ).toEqual(['APP', '60.0', 'DOCS', '40.0']);
  });

  it('label.formatter speaks for the whole label', () => {
    expect(
      labels({ label: { formatter: ({ label, share }) => `${label}: ${Math.round(share * 100)}%`, value: { enabled: true } } }),
    ).toEqual(['App: 60%', 'Docs: 40%']);
  });

  it('minShare leaves the small nodes unlabelled', () => {
    const rows: Datum[] = [
      { label: 'Big', size: 95 },
      { label: 'Small', size: 5 },
    ];
    expect(labels({ label: { minShare: 0.1 } }, rows)).toEqual(['Big']);
  });

  it('a label wider than its tile is not drawn at all', () => {
    const rows: Datum[] = [
      { label: 'Room enough', size: 97 },
      { label: 'No room for this one at all', size: 3 },
    ];
    expect(labels({}, rows)).toEqual(['Room enough']);
  });

  it('label.enabled false leaves the tiles bare', () => {
    expect(labels({ label: { enabled: false, value: { enabled: true } } })).toEqual([]);
  });
});

describe('gaps', () => {
  /** Two groups of one tile each — the group gap shows between them, the tiles fill what is left. */
  const groups: Datum[] = [
    { label: 'Front', children: [{ label: 'App', size: 60 }] },
    { label: 'Back', children: [{ label: 'API', size: 40 }] },
  ];

  it('itemGap goes between the tiles and nowhere else', () => {
    const rects = rectNodes({ itemGap: 10 }).map((rect) => ({ x: rect.x, width: rect.width }));
    // the pair still spans the whole plot: no half-gap eaten off either edge
    expect(rects).toEqual([
      { x: 0, width: 235 },
      { x: 245, width: 155 },
    ]);
  });

  it('tiles touch the edges of the plot however wide the gap is', () => {
    const rects = rectNodes({ itemGap: 40 });
    expect(rects[0]?.x).toBe(0);
    expect((rects[1]?.x ?? 0) + (rects[1]?.width ?? 0)).toBe(plot.width);
  });

  it('groupGap spaces the groups apart, itemGap the tiles inside them', () => {
    const rects = rectNodes({ itemGap: 2, groupGap: 20 }, groups).map((rect) => ({ x: rect.x, y: rect.y, width: rect.width }));
    // 20 between the groups, and each group's only tile keeps the group's edges
    expect(rects).toEqual([
      { x: 0, y: 18, width: 230 },
      { x: 250, y: 18, width: 150 },
    ]);
  });

  it('groupGap falls back to itemGap', () => {
    expect(rectNodes({ itemGap: 20 }, groups).map((rect) => rect.x)).toEqual([0, 250]);
  });
});

describe('group headers', () => {
  const nested: Datum[] = [{ label: 'Frontend', children: [{ label: 'App', size: 30 }] }];

  it('read the same halves as their tiles, in one row', () => {
    expect(labels({ label: { value: { enabled: true } } }, nested)).toEqual(['Frontend', ' · ', '30', 'App', '30']);
  });

  it('state the summed value of the group', () => {
    const rows: Datum[] = [
      {
        label: 'Frontend',
        children: [
          { label: 'App', size: 30 },
          { label: 'Docs', size: 10 },
        ],
      },
    ];
    expect(labels({ label: { value: { enabled: true } } }, rows)).toContain('40');
  });

  it('leave the strip unpainted until a background is asked for', () => {
    // one rectangle only: the tile of the child, no strip behind the heading
    expect(rectNodes({}, nested)).toHaveLength(1);
    const painted = rectNodes({ groupHeader: { background: '#222222' } }, nested);
    expect(painted).toHaveLength(2);
    expect(painted[0]).toMatchObject({ x: 0, y: 0, height: 18, fill: '#222222' });
  });

  it('are written in the color of their group, and contrast against a painted strip', () => {
    expect(labelNodes({}, nested)[0]).toMatchObject({ text: 'Frontend', fill: '#436ff4' });
    expect(labelNodes({ groupHeader: { background: '#111111' } }, nested)[0]?.fill).toBe('#ffffff');
    expect(labelNodes({ groupHeader: { color: '#ff0000' } }, nested)[0]?.fill).toBe('#ff0000');
  });

  it('take their font from groupHeader, then from label', () => {
    expect(labelNodes({ label: { fontSize: 15 } }, nested)[0]).toMatchObject({ text: 'Frontend', fontSize: 15, fontWeight: 'bold' });
    // a taller font needs a taller strip: a heading that does not fit its strip is not drawn
    const styled = { label: { fontSize: 15 }, groupHeader: { height: 30, fontSize: 20, fontWeight: 'normal' as const } };
    expect(labelNodes(styled, nested)[0]).toMatchObject({ text: 'Frontend', fontSize: 20, fontWeight: 'normal' });
  });

  it('groupHeader.height sets the strip, and the tiles start under it', () => {
    expect(rectNodes({ groupHeader: { height: 40 } }, nested)[0]).toMatchObject({ y: 40 });
  });
});

describe('names', () => {
  it('labelName spells the name out wherever it appears', () => {
    const instance = series({ labelName: { formatter: ({ value }) => `<${String(value)}>` } });
    instance.setData(data);
    expect(instance.legendItems().map((item) => item.label)).toEqual(['<App>', '<Docs>']);
    expect(labels({ labelName: { formatter: ({ value }) => `<${String(value)}>` } })).toEqual(['<App>', '<Docs>']);
  });
});

describe('rubber band', () => {
  it('catches the tiles the band overlaps', () => {
    const instance = series({});
    instance.setData(data);
    instance.update({ data, plot, layer: new Group(), measureText });
    // the whole plot catches both tiles, a sliver of the left edge only the first
    expect(instance.pickInRect(0, 0, plot.width, plot.height).sort()).toEqual([0, 1]);
    expect(instance.pickInRect(0, 0, 4, plot.height)).toEqual([0]);
    expect(instance.pickInRect(-20, -20, -5, -5)).toEqual([]);
  });
});

describe('tooltip', () => {
  it('states the value and its share of the whole', () => {
    expect(tooltip(0)).toMatchObject({ heading: 'App', rows: [{ label: 'size', value: '60 (60%)' }] });
  });
});
