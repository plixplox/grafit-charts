import { ConeFunnelSeries, type ConeFunnelSeriesOptions } from './index';
import type { LabelOverflowContext, LayoutRect, SeriesEnv } from '@/shared/kernel';
import { LinearScale } from '@/shared/scale';
import { Group, Path, Text } from '@/shared/scene';
import { LabelPlacements } from '@/shared/util';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'cone-funnel-0',
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
  { stage: 'Leads', count: 100 },
  { stage: 'Won', count: 50 },
];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function context(): LabelOverflowContext {
  return {
    data,
    xScale: new LinearScale([0, 1], [plot.x, plot.x + plot.width]),
    yScale: new LinearScale([0, 1], [plot.y + plot.height, plot.y]),
    swapped: false,
    plot,
    measureText,
  };
}

function series(options: Partial<ConeFunnelSeriesOptions>): ConeFunnelSeries {
  return new ConeFunnelSeries(
    { type: 'cone-funnel', stageField: 'stage', valueField: 'count', xField: 'stage', yField: 'count', ...options },
    env,
  );
}

/** Text nodes the series drew, in drawing order — a label block is several of them. */
function labelNodes(options: Partial<ConeFunnelSeriesOptions>, rows = data, height = plot.height): Text[] {
  const funnel = series(options);
  const layer = new Group();
  funnel.update({
    data: rows,
    xScale: new LinearScale([0, 1], [plot.x, plot.x + plot.width]),
    yScale: new LinearScale([0, 1], [plot.y + height, plot.y]),
    swapped: false,
    plot: { ...plot, height },
    layer,
    measureText,
    labelGuard: new LabelPlacements(measureText),
  });
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
function labels(options: Partial<ConeFunnelSeriesOptions>, rows = data, height = plot.height): string[] {
  return labelNodes(options, rows, height).map((node) => node.text);
}

describe('room the stage labels ask for', () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };

  it('is nothing for labels inside the shape', () => {
    expect(series({}).labelOverflow(context())).toEqual(none);
    expect(series({ label: { placement: 'inside' } }).labelOverflow(context())).toEqual(none);
  });

  it('covers the widest outside label past the shape edge', () => {
    const funnel = series({ label: { placement: 'outside' } });
    const overflow = funnel.labelOverflow(context());
    // top stage: full width 0.62 · 400, the slanted edge met at (100% + 50%) / 4
    const edgeX = plot.width / 2 + (0.62 * 400 + 0.62 * 200) / 4;
    // 3px to the callout, 14px of line, 5px to the text
    const expected = edgeX + 3 + 14 + 5 + measureText('Leads · 100') - plot.width;
    expect(overflow.right).toBeCloseTo(expected, 6);
    expect(overflow.left).toBe(0);
  });

  it('counts the formatted text', () => {
    const funnel = series({
      label: { placement: 'outside', formatter: ({ stage }) => `${stage} — a much longer caption` },
    });
    const short = series({ label: { placement: 'outside', formatter: ({ stage }) => stage } });
    expect(funnel.labelOverflow(context()).right).toBeGreaterThan(short.labelOverflow(context()).right);
  });

  it('leaves out the stages minShare does not consider worth a label', () => {
    // Won is a third of the total, so 0.4 leaves Leads as the only labelled stage
    const funnel = series({ label: { placement: 'outside', minShare: 0.4 } });
    const edgeX = plot.width / 2 + (0.62 * 400 + 0.62 * 200) / 4;
    const expected = edgeX + 3 + 14 + 5 + measureText('Leads · 100') - plot.width;
    expect(funnel.labelOverflow(context()).right).toBeCloseTo(expected, 6);
    expect(series({ label: { placement: 'outside', minShare: 1 } }).labelOverflow(context())).toEqual(none);
  });
});

describe('stage labels', () => {
  const crowded = [
    { stage: 'Leads', count: 100 },
    { stage: 'Trials', count: 70 },
    { stage: 'Deals', count: 3 },
    { stage: 'Won', count: 2 },
  ];

  it('reads as the stage name and its value, in one row', () => {
    expect(labels({})).toEqual(['Leads', ' · ', '100', 'Won', ' · ', '50']);
  });

  it('puts the value on its own line when stacked, with no separator', () => {
    expect(labels({ label: { layout: 'stacked' } })).toEqual(['Leads', '100', 'Won', '50']);
  });

  it('takes either half away on its own', () => {
    expect(labels({ label: { value: { enabled: false } } })).toEqual(['Leads', 'Won']);
    expect(labels({ label: { category: { enabled: false } } })).toEqual(['100', '50']);
  });

  it('reads the value as a share of the whole funnel when asked to', () => {
    expect(labels({ label: { value: { type: 'percent' } } })).toEqual(['Leads', ' · ', '67%', 'Won', ' · ', '33%']);
  });

  it('formats the stage name the way it formats the value beside it', () => {
    const dated = [
      { stage: '2024-06-15T00:00:00Z', count: 100 },
      { stage: '2024-07-15T00:00:00Z', count: 50 },
    ];
    expect(labels({ label: { category: { format: '%d.%m' }, value: { enabled: false } } }, dated)).toEqual(['15.06', '15.07']);
  });

  it('hands the name formatter the datum, the value and the share', () => {
    const texts = labels({
      label: { category: { formatter: ({ stage, share }) => `${stage} ${Math.round(share * 100)}%` }, value: { enabled: false } },
    });
    expect(texts).toEqual(['Leads 67%', 'Won 33%']);
  });

  it('gives each half its own font', () => {
    const nodes = labelNodes({ label: { category: { fontWeight: 'bold' }, value: { fontSize: 9, color: '#999' } } });
    expect(nodes[0]?.fontWeight).toBe('bold');
    expect(nodes[2]?.fontSize).toBe(9);
    expect(nodes[2]?.fill).toBe('#999');
  });

  it('lets label.formatter speak for the whole label', () => {
    expect(labels({ label: { formatter: ({ stage, value }) => `${stage}: ${value}` } })).toEqual(['Leads: 100', 'Won: 50']);
  });

  it('labels every stage until minShare says otherwise', () => {
    expect(labels({ label: { minShare: 0.4 } })).toEqual(['Leads', ' · ', '100']);
  });

  it('gives the room to the largest stages when the labels do not all fit', () => {
    // 40px of plot for four stages: their labels land on top of each other
    expect(labels({}, crowded, 40).filter((text) => text === ' · ')).toHaveLength(4);
    const kept = labels({ label: { avoidOverlap: true } }, crowded, 40);
    expect(kept.filter((text) => text === ' · ').length).toBeLessThan(4);
    // the largest stage asks first, so it is never the one left out
    expect(kept).toContain('Leads');
    expect(kept).not.toContain('Trials');
  });
});

describe('the name of a stage', () => {
  const dated = [
    { stage: '2024-06-15T00:00:00Z', count: 100 },
    { stage: '2024-07-15T00:00:00Z', count: 50 },
  ];

  function rendered(options: Partial<ConeFunnelSeriesOptions>, rows = dated): ConeFunnelSeries {
    const funnel = series(options);
    funnel.update({
      data: rows,
      xScale: new LinearScale([0, 1], [plot.x, plot.x + plot.width]),
      yScale: new LinearScale([0, 1], [plot.y + plot.height, plot.y]),
      swapped: false,
      plot,
      layer: new Group(),
      measureText,
    });
    return funnel;
  }

  it('spells the stage out the same way in the legend, the tooltip and the label', () => {
    const options: Partial<ConeFunnelSeriesOptions> = {
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

  it('hands the spelled-out name to the tooltip renderer', () => {
    const funnel = rendered({
      stageName: { format: '%d.%m' },
      tooltip: { renderer: ({ stage }) => `stage ${stage}` },
    });
    expect(funnel.tooltipFor(1).heading).toBe('stage 15.07');
  });

  it('lets the label ask for something shorter than the legend', () => {
    const options: Partial<ConeFunnelSeriesOptions> = {
      stageName: { format: '%d.%m.%Y' },
      label: { category: { format: '%d.%m' }, value: { enabled: false } },
    };
    expect(rendered(options).legendItems()[0]?.label).toBe('15.06.2024');
    expect(labels(options, dated)).toEqual(['15.06', '15.07']);
  });
});

describe('the selection', () => {
  /** Stage shapes the series draws, in drawing order. */
  function marks(selected: number[]): Path[] {
    const funnel = series({});
    const layer = new Group();
    funnel.update({
      data,
      xScale: new LinearScale([0, 1], [plot.x, plot.x + plot.width]),
      yScale: new LinearScale([0, 1], [plot.y + plot.height, plot.y]),
      swapped: false,
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

  it('outlines the picked-out stage and fades the rest', () => {
    const [picked, other] = marks([0]);
    expect(picked?.stroke).toBe('#000');
    expect(picked?.strokeWidth).toBe(2);
    expect(picked?.opacity).toBe(1);
    expect(other?.stroke).toBeUndefined();
    expect(other?.opacity).toBeCloseTo(0.3, 6);
  });

  it('leaves every stage alone while nothing is selected', () => {
    expect(marks([]).map((node) => node.opacity)).toEqual([1, 1]);
  });
});

describe('the stage tooltip', () => {
  function rendered(options: Partial<ConeFunnelSeriesOptions>, datumIndex: number) {
    const funnel = series(options);
    const layer = new Group();
    funnel.update({
      data,
      xScale: new LinearScale([0, 1], [plot.x, plot.x + plot.width]),
      yScale: new LinearScale([0, 1], [plot.y + plot.height, plot.y]),
      swapped: false,
      plot,
      layer,
      measureText,
    });
    return funnel.tooltipFor(datumIndex);
  }

  it('reads the value with its share of the whole funnel', () => {
    expect(rendered({}, 1).rows[0]?.value).toBe('50 (33%)');
  });

  it('hands the renderer the stage, the value and the colour', () => {
    const content = rendered({ tooltip: { renderer: ({ stage, value, color }) => `${stage}: ${String(value)} ${color}` } }, 0);
    expect(content.heading).toBe('Leads: 100 #436ff4');
  });
});
