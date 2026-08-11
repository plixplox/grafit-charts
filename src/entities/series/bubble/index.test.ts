import { BubbleSeries, type BubbleSeriesOptions } from './index';
import type { CartesianRenderContext, LayoutRect, SeriesEnv } from '@/shared/kernel';
import type { Datum } from '@/shared/options';
import { LinearScale } from '@/shared/scale';
import { Group, Text } from '@/shared/scene';
import { LabelPlacements } from '@/shared/util';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'bubble-0',
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

function bubbleLabels(options: Partial<BubbleSeriesOptions>, rows: Datum[] = data, guard = false): string[] {
  const series = new BubbleSeries({ type: 'bubble', xField: 'gdp', yField: 'happiness', sizeField: 'population', ...options }, env);
  const ctx = context(rows, guard);
  series.update(ctx);
  return textsOf(ctx.layer);
}

describe('bubble labels', () => {
  it('reads the value as the share of the total bubble size', () => {
    // population 1400 of 2000, and 600 of 2000
    expect(bubbleLabels({ labelField: 'country', label: { enabled: true, value: { type: 'percent' } } })).toEqual([
      'India',
      ' · ',
      '70%',
      'USA',
      ' · ',
      '30%',
    ]);
  });

  it('leaves out the bubbles minShare does not consider worth a label', () => {
    expect(bubbleLabels({ labelField: 'country', label: { enabled: true, minShare: 0.5 } })).toEqual(['India', ' · ', '1400']);
  });

  it('gives the room to the biggest bubble, whatever its place in the data', () => {
    // both bubbles land on the same spot: only one label can have it
    const stacked = [
      { country: 'Tiny', gdp: 40, happiness: 4, population: 50 },
      { country: 'Huge', gdp: 40, happiness: 4, population: 2000 },
    ];
    expect(bubbleLabels({ labelField: 'country', label: { enabled: true } }, stacked, true)).toContain('Tiny');
    const kept = bubbleLabels({ labelField: 'country', label: { enabled: true, avoidOverlap: true } }, stacked, true);
    expect(kept).toContain('Huge');
    expect(kept).not.toContain('Tiny');
  });

  it('reads the size row of the tooltip with its share', () => {
    const series = new BubbleSeries({ type: 'bubble', xField: 'gdp', yField: 'happiness', sizeField: 'population' }, env);
    series.update(context(data));
    expect(series.tooltipFor(0).rows.at(-1)).toEqual({ label: 'population', value: '1400 (70%)' });
  });
});
