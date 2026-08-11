import { HeatmapSeries, type HeatmapSeriesOptions } from './index';
import type { SeriesEnv, TooltipContentData } from '@/shared/kernel';
import { BandScale } from '@/shared/scale';
import { Group, Text, type SceneNode } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'heatmap-0',
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

/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

const data = [
  { week: 'W1', day: 'Mon', deploys: 1234.5 },
  { week: 'W1', day: 'Tue', deploys: 42 },
  { week: 'W2', day: 'Mon', deploys: Number.NaN },
];

function series(options: Partial<HeatmapSeriesOptions> = {}): HeatmapSeries {
  return new HeatmapSeries({ type: 'heatmap', xField: 'week', yField: 'day', colorField: 'deploys', ...options }, env);
}

/** Every Text under a node, however deeply the series nested its groups. */
function textsUnder(node: SceneNode): Text[] {
  if (node instanceof Text) return [node];
  const children = (node as unknown as { children?: SceneNode[] }).children ?? [];
  return children.flatMap(textsUnder);
}

/** Renders the series and returns the label texts it drew. */
function labels(options: Partial<HeatmapSeriesOptions> = {}): string[] {
  const instance = series(options);
  const layer = new Group();
  instance.update({
    data,
    xScale: new BandScale(['W1', 'W2'], [0, 200]),
    yScale: new BandScale(['Mon', 'Tue'], [0, 200]),
    swapped: false,
    plot: { x: 0, y: 0, width: 200, height: 200 },
    layer,
    measureText,
  });
  return textsUnder(layer).map((node) => node.text);
}

/** Renders once so the tooltip has a context, then asks it about a cell. */
function tooltip(datumIndex: number, options: Partial<HeatmapSeriesOptions> = {}): TooltipContentData {
  const instance = series(options);
  const layer = new Group();
  instance.update({
    data,
    xScale: new BandScale(['W1', 'W2'], [0, 200]),
    yScale: new BandScale(['Mon', 'Tue'], [0, 200]),
    swapped: false,
    plot: { x: 0, y: 0, width: 200, height: 200 },
    layer,
    measureText,
  });
  return instance.tooltipFor(datumIndex);
}

describe('cell labels', () => {
  it('draws nothing until they are switched on', () => {
    expect(labels()).toEqual([]);
  });

  it('shows the raw value, skipping the cells that have none', () => {
    expect(labels({ label: { enabled: true } })).toEqual(['1234.5', '42']);
  });

  it('spells the value out with the format string', () => {
    expect(labels({ label: { enabled: true, format: ',.1f' } })).toEqual(['1 234.5', '42.0']);
  });

  it('lets the formatter win over the format string', () => {
    const texts = labels({ label: { enabled: true, format: ',.1f', formatter: ({ value }) => `${value}×` } });
    expect(texts).toEqual(['1234.5×', '42×']);
  });
});

describe('cell tooltip', () => {
  it('names both categories and the value', () => {
    expect(tooltip(0)).toEqual({
      heading: 'W1 · Mon',
      rows: [{ label: 'deploys', value: '1234.5', color: expect.any(String) }],
    });
  });

  it('reads the value through the label format — a format is about the number', () => {
    expect(tooltip(0, { label: { enabled: true, format: ',.1f' } }).rows[0]?.value).toBe('1 234.5');
  });

  it('leaves a cell formatter to the cell it was written for', () => {
    expect(tooltip(0, { label: { enabled: true, formatter: ({ value }) => `${value}×` } }).rows[0]?.value).toBe('1234.5');
  });

  it('hands the renderer the datum, both categories and the colour', () => {
    const content = tooltip(1, {
      tooltip: { renderer: ({ xValue, yValue, value, datum }) => `${xValue}/${yValue}: ${value} of ${Object.keys(datum).length} fields` },
    });
    expect(content).toEqual({ heading: 'W1/Tue: 42 of 3 fields', rows: [] });
  });

  it('takes the rows a renderer returns as they are', () => {
    const content = tooltip(0, {
      tooltip: { renderer: ({ value }) => ({ heading: 'Deploys', rows: [{ label: 'n', value: `${value}` }] }) },
    });
    expect(content).toEqual({ heading: 'Deploys', rows: [{ label: 'n', value: '1234.5' }] });
  });
});
