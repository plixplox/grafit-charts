import { ScatterSeries, type ScatterSeriesOptions } from './index';
import type { CartesianRenderContext, LayoutRect, SeriesEnv } from '@/shared/kernel';
import type { Datum } from '@/shared/options';
import { LinearScale } from '@/shared/scale';
import { Group, Text } from '@/shared/scene';
import { LabelPlacements } from '@/shared/util';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'scatter-0',
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
  { country: 'India', gdp: 12, happiness: 6, population: 1400 },
  { country: 'USA', gdp: 76, happiness: 7, population: 600 },
];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function context(rows: Datum[], guard = false): CartesianRenderContext {
  return {
    data: rows,
    xScale: new LinearScale([0, 80], [plot.x, plot.x + plot.width]),
    yScale: new LinearScale([0, 8], [plot.y + plot.height, plot.y]),
    swapped: false,
    plot,
    layer: new Group(),
    measureText,
    ...(guard ? { labelGuard: new LabelPlacements(measureText) } : {}),
  };
}

/** The runs of every label the series drew, in drawing order. */
function textsOf(layer: Group): string[] {
  const found: string[] = [];
  const walk = (node: { children?: unknown[] }) => {
    for (const child of node.children ?? []) {
      if (child instanceof Text) found.push(child.text);
      else walk(child as { children?: unknown[] });
    }
  };
  walk(layer as unknown as { children?: unknown[] });
  return found;
}

function scatterLabels(options: Partial<ScatterSeriesOptions>, rows: Datum[] = data, guard = false): string[] {
  const series = new ScatterSeries({ type: 'scatter', xField: 'gdp', yField: 'happiness', ...options }, env);
  const ctx = context(rows, guard);
  series.update(ctx);
  return textsOf(ctx.layer);
}

describe('point labels', () => {
  it('is the bare value until labelField gives the point a name', () => {
    expect(scatterLabels({ label: { enabled: true } })).toEqual(['6', '7']);
    expect(scatterLabels({ labelField: 'country', label: { enabled: true } })).toEqual(['India', ' · ', '6', 'USA', ' · ', '7']);
  });

  it('puts the value on its own line when stacked, with no separator', () => {
    expect(scatterLabels({ labelField: 'country', label: { enabled: true, layout: 'stacked' } })).toEqual(['India', '6', 'USA', '7']);
  });

  it('takes either half away on its own', () => {
    expect(scatterLabels({ labelField: 'country', label: { enabled: true, value: { enabled: false } } })).toEqual(['India', 'USA']);
    expect(scatterLabels({ labelField: 'country', label: { enabled: true, category: { enabled: false } } })).toEqual(['6', '7']);
  });

  it('formats the point name the way it formats the value beside it', () => {
    const dated = [
      { country: '2024-06-15T00:00:00Z', gdp: 12, happiness: 6 },
      { country: '2024-07-15T00:00:00Z', gdp: 76, happiness: 7 },
    ];
    expect(
      scatterLabels({ labelField: 'country', label: { enabled: true, category: { format: '%d.%m' }, value: { enabled: false } } }, dated),
    ).toEqual(['15.06', '15.07']);
  });

  it('gives each half its own font', () => {
    const series = new ScatterSeries(
      {
        type: 'scatter',
        xField: 'gdp',
        yField: 'happiness',
        labelField: 'country',
        label: { enabled: true, category: { fontWeight: 'bold' }, value: { fontSize: 9, color: '#999' } },
      },
      env,
    );
    const ctx = context(data);
    series.update(ctx);
    const nodes: Text[] = [];
    const walk = (node: { children?: unknown[] }) => {
      for (const child of node.children ?? []) {
        if (child instanceof Text) nodes.push(child);
        else walk(child as { children?: unknown[] });
      }
    };
    walk(ctx.layer as unknown as { children?: unknown[] });
    expect(nodes[0]?.fontWeight).toBe('bold');
    expect(nodes[2]?.fontSize).toBe(9);
    expect(nodes[2]?.fill).toBe('#999');
  });

  it('reads the value as a share of the y values when asked to', () => {
    // 6 of 6 + 7
    expect(scatterLabels({ label: { enabled: true, value: { type: 'percent' } } })).toEqual(['46%', '54%']);
  });

  it('lets label.formatter speak for the whole label', () => {
    expect(scatterLabels({ labelField: 'country', label: { enabled: true, formatter: ({ value }) => `y=${value}` } })).toEqual([
      'y=6',
      'y=7',
    ]);
  });

  it('keeps the earlier point when two labels want the same spot', () => {
    // both points land on the same place: a scatter has no size to rank them by
    const stacked = [
      { country: 'First', gdp: 40, happiness: 4 },
      { country: 'Second', gdp: 40, happiness: 4 },
    ];
    const kept = scatterLabels({ labelField: 'country', label: { enabled: true, avoidOverlap: true } }, stacked, true);
    expect(kept).toContain('First');
    expect(kept).not.toContain('Second');
  });
});
