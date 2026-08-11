import { PyramidSeries, type PyramidSeriesOptions } from './index';
import type { LayoutRect, SeriesEnv, TooltipContentData } from '@/shared/kernel';
import type { Datum } from '@/shared/options';
import { Group, Path, Text } from '@/shared/scene';
import { LabelPlacements } from '@/shared/util';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'pyramid-0',
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
const data = [
  { stage: 'Awareness', count: 60 },
  { stage: 'Purchase', count: 40 },
];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function series(options: Partial<PyramidSeriesOptions>): PyramidSeries {
  return new PyramidSeries({ type: 'pyramid', stageField: 'stage', valueField: 'count', ...options }, env);
}

/** Text nodes the series drew, in drawing order — a label block is several of them. */
function labelNodes(options: Partial<PyramidSeriesOptions>, rows: Datum[] = data, height = plot.height): Text[] {
  const instance = series(options);
  instance.setData(rows);
  const layer = new Group();
  instance.update({ data: rows, plot: { ...plot, height }, layer, measureText, labelGuard: new LabelPlacements(measureText) });
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

/** The runs of every label the series drew. */
function labels(options: Partial<PyramidSeriesOptions>, rows: Datum[] = data, height = plot.height): string[] {
  return labelNodes(options, rows, height).map((node) => node.text);
}

/** Renders once so the tooltip has a context, then asks it about a layer. */
function tooltip(datumIndex: number, options: Partial<PyramidSeriesOptions> = {}): TooltipContentData {
  const instance = series(options);
  instance.setData(data);
  instance.update({ data, plot, layer: new Group(), measureText });
  return instance.tooltipFor(datumIndex);
}

describe('layer labels', () => {
  const crowded = [
    { stage: 'Awareness', count: 100 },
    { stage: 'Interest', count: 70 },
    { stage: 'Desire', count: 3 },
    { stage: 'Action', count: 2 },
  ];

  it('reads as the layer name and its value, in one row', () => {
    expect(labels({})).toEqual(['Awareness', ' · ', '60', 'Purchase', ' · ', '40']);
  });

  it('puts the value on its own line when stacked, with no separator', () => {
    expect(labels({ label: { layout: 'stacked' } })).toEqual(['Awareness', '60', 'Purchase', '40']);
  });

  it('takes either half away on its own', () => {
    expect(labels({ label: { value: { enabled: false } } })).toEqual(['Awareness', 'Purchase']);
    expect(labels({ label: { category: { enabled: false } } })).toEqual(['60', '40']);
  });

  it('reads the value as a share when asked to', () => {
    expect(labels({ label: { value: { type: 'percent' } } })).toEqual(['Awareness', ' · ', '60%', 'Purchase', ' · ', '40%']);
    expect(labels({ label: { value: { format: ',.1f' } } })).toEqual(['Awareness', ' · ', '60.0', 'Purchase', ' · ', '40.0']);
  });

  it('formats the layer name the way it formats the value beside it', () => {
    const dated = [
      { stage: '2024-06-15T00:00:00Z', count: 60 },
      { stage: '2024-07-15T00:00:00Z', count: 40 },
    ];
    expect(labels({ label: { category: { format: '%d.%m' }, value: { enabled: false } } }, dated)).toEqual(['15.06', '15.07']);
  });

  it('hands the name formatter the datum, the value and the share', () => {
    expect(
      labels({
        label: { category: { formatter: ({ stage, share }) => `${stage} ${Math.round(share * 100)}%` }, value: { enabled: false } },
      }),
    ).toEqual(['Awareness 60%', 'Purchase 40%']);
  });

  it('gives each half its own font', () => {
    const nodes = labelNodes({ label: { category: { fontWeight: 'bold' }, value: { fontSize: 9, color: '#999' } } });
    expect(nodes[0]?.fontWeight).toBe('bold');
    expect(nodes[2]?.fontSize).toBe(9);
    expect(nodes[2]?.fill).toBe('#999');
  });

  it('lets label.formatter speak for the whole label', () => {
    expect(labels({ label: { formatter: ({ stage, value }) => `${stage}: ${value}` } })).toEqual(['Awareness: 60', 'Purchase: 40']);
  });

  it('labels every layer until minShare says otherwise', () => {
    expect(labels({ label: { minShare: 0.5 } })).toEqual(['Awareness', ' · ', '60']);
    expect(labels({ label: { placement: 'inside', minShare: 0.5 } })).toEqual(['Awareness', ' · ', '60']);
  });

  it('gives the room to the thickest layers when the labels do not all fit', () => {
    // 40px of plot for four layers: the labels inside them land on each other
    const all = labels({ label: { placement: 'inside' } }, crowded, 40);
    expect(all.filter((text) => text === ' · ')).toHaveLength(4);
    const kept = labels({ label: { placement: 'inside', avoidOverlap: true } }, crowded, 40);
    expect(kept.filter((text) => text === ' · ').length).toBeLessThan(4);
    // the thickest layer asks first, so it is never the one left out
    expect(kept).toContain('Awareness');
    expect(kept).not.toContain('Action');
  });

  it('draws every label without a guard to ask', () => {
    const instance = series({ label: { placement: 'inside', avoidOverlap: true } });
    instance.setData(crowded);
    const layer = new Group();
    instance.update({ data: crowded, plot: { ...plot, height: 40 }, layer, measureText });
    const found: Text[] = [];
    const walk = (node: { children?: unknown[] }) => {
      for (const child of node.children ?? []) {
        if (child instanceof Text) found.push(child);
        else walk(child as { children?: unknown[] });
      }
    };
    walk(layer as unknown as { children?: unknown[] });
    expect(found.filter((node) => node.text === ' · ')).toHaveLength(4);
  });
});

describe('the name of a layer', () => {
  const dated = [
    { stage: '2024-06-15T00:00:00Z', count: 60 },
    { stage: '2024-07-15T00:00:00Z', count: 40 },
  ];

  function rendered(options: Partial<PyramidSeriesOptions>, rows: Datum[] = dated): PyramidSeries {
    const instance = series(options);
    instance.setData(rows);
    instance.update({ data: rows, plot, layer: new Group(), measureText });
    return instance;
  }

  it('spells the layer out the same way in the legend, the tooltip and the label', () => {
    const options: Partial<PyramidSeriesOptions> = {
      stageName: { formatter: ({ value }) => `week of ${String(value).slice(0, 10)}` },
      label: { value: { enabled: false } },
    };
    expect(
      rendered(options)
        .legendItems()
        .map((item) => item.label),
    ).toEqual(['week of 2024-06-15', 'week of 2024-07-15']);
    expect(rendered(options).tooltipFor(0).heading).toBe('week of 2024-06-15');
    expect(labels(options, dated)).toEqual(['week of 2024-06-15', 'week of 2024-07-15']);
  });

  it('takes a format string as well as a formatter', () => {
    expect(rendered({ stageName: { format: '%d.%m.%Y' } }).legendItems()[0]?.label).toBe('15.06.2024');
  });

  it('lets the label ask for something shorter than the legend', () => {
    const options: Partial<PyramidSeriesOptions> = {
      stageName: { format: '%d.%m.%Y' },
      label: { category: { format: '%d.%m' }, value: { enabled: false } },
    };
    expect(rendered(options).legendItems()[0]?.label).toBe('15.06.2024');
    expect(labels(options, dated)).toEqual(['15.06', '15.07']);
  });
});

describe('the selection', () => {
  /** Path nodes the series draws, in drawing order. */
  function marks(selected: number[]): Path[] {
    const instance = series({});
    instance.setData(data);
    const layer = new Group();
    instance.update({
      data,
      plot,
      layer,
      measureText,
      selected: new Set(selected),
      selectionActive: selected.length > 0,
      selectionStyle: { stroke: '#000', strokeWidth: 2, inactiveOpacity: 0.3 },
    });
    const found: Path[] = [];
    const walk = (node: { children?: unknown[] }) => {
      for (const child of node.children ?? []) {
        if (child instanceof Path) found.push(child);
        else walk(child as { children?: unknown[] });
      }
    };
    walk(layer as unknown as { children?: unknown[] });
    return found;
  }

  it('outlines the picked-out layer and fades the rest', () => {
    const [picked, other] = marks([0]);
    expect(picked?.stroke).toBe('#000');
    expect(picked?.strokeWidth).toBe(2);
    expect(picked?.opacity).toBe(1);
    expect(other?.stroke).toBeUndefined();
    expect(other?.opacity).toBeCloseTo(0.3, 6);
  });

  it('leaves every layer alone while nothing is selected', () => {
    expect(marks([]).map((node) => node.opacity)).toEqual([1, 1]);
  });
});

describe('the layer tooltip', () => {
  it('reads the value with its share of the whole pyramid', () => {
    expect(tooltip(1).rows[0]?.value).toBe('40 (40%)');
  });

  it('hands the renderer the stage, the value and the colour', () => {
    const content = tooltip(0, { tooltip: { renderer: ({ stage, value, color }) => `${stage}: ${String(value)} ${color}` } });
    expect(content.heading).toBe('Awareness: 60 #436ff4');
  });
});
