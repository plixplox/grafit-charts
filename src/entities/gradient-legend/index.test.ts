import {
  GRADIENT_LEGEND_HEIGHT,
  GRADIENT_LEGEND_WIDTH,
  gradientLegendExtent,
  gradientLegendHorizontal,
  renderGradientLegend,
} from './index';
import type { ColorScaleInfo, LayoutRect, ThemeContext } from '@/shared/kernel';
import { Group, Rect, Text, type SceneNode } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const theme: ThemeContext = {
  backgroundColor: '#fff',
  foregroundColor: '#000',
  mutedColor: '#888',
  axisColor: '#ddd',
  fontFamily: 'sans-serif',
  fontSize: 11,
  strokeWidth: 2,
  positiveColor: '#21a06c',
  negativeColor: '#e5484d',
  palette: { fills: [], strokes: [], sequential: ['#dbe6ff', '#1d4fd7'] },
  axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
};

const rect: LayoutRect = { x: 200, y: 20, width: 42, height: 300 };
const info: ColorScaleInfo = { min: 44770.628, max: 10745042.255, colors: ['#dbe6ff', '#1d4fd7'] };
/** 10px per character — keeps the expectations arithmetic. */
const metrics = { info, theme, measureText: (text: string) => text.length * 10 };

/** Nodes the scale appended, in order — Group keeps its children to itself. */
function drawn(render: (layer: Group) => void): SceneNode[] {
  const layer = new Group();
  const nodes: SceneNode[] = [];
  layer.append = ((...appended: SceneNode[]) => {
    nodes.push(...appended);
    return layer;
  }) as typeof layer.append;
  render(layer);
  return nodes;
}

/** Texts of the rendered scale in the order they were appended. */
function labelsOf(render: (layer: Group) => void): string[] {
  return drawn(render)
    .filter((node): node is Text => node instanceof Text)
    .map((node) => node.text);
}

describe('renderGradientLegend', () => {
  it('labels the ends with the raw values by default', () => {
    expect(labelsOf((layer) => renderGradientLegend(layer, rect, info, theme))).toEqual([String(info.max), String(info.min)]);
  });

  it('passes both ends through the formatter', () => {
    const labels = labelsOf((layer) =>
      renderGradientLegend(layer, rect, info, theme, { label: { formatter: ({ value }) => `${Math.round(value / 1000)}K` } }),
    );

    expect(labels).toEqual(['10745K', '45K']);
  });

  it('spells the ends out with the format string when there is no formatter', () => {
    const labels = labelsOf((layer) => renderGradientLegend(layer, rect, info, theme, { label: { format: ',.1f' } }));

    // ',' groups the digits with a thin space, as the number formatter does everywhere
    expect(labels).toEqual(['10\u2009745\u2009042.3', '44\u2009770.6']);
  });

  it('formats the ends of a horizontal scale as well', () => {
    const labels = labelsOf((layer) =>
      renderGradientLegend(layer, { x: 20, y: 320, width: 300, height: 24 }, info, theme, {
        position: 'bottom',
        label: { formatter: ({ value }) => value.toFixed(0) },
      }),
    );

    expect(labels).toEqual(['44771', '10745042']);
  });

  it('caps a vertical bar with its ends, above and below rather than beside', () => {
    const nodes = drawn((layer) => renderGradientLegend(layer, rect, info, theme));
    const bars = nodes.filter((node): node is Rect => node instanceof Rect);
    const texts = nodes.filter((node): node is Text => node instanceof Text);
    const barTop = Math.min(...bars.map((bar) => bar.y));
    const barBottom = Math.max(...bars.map((bar) => bar.y + bar.height));

    // both ends are centred on the bar, the max above it and the min below
    for (const node of texts) expect(node.textAlign).toBe('center');
    expect(texts[0]?.y).toBeLessThanOrEqual(barTop);
    expect(texts[1]?.y).toBeGreaterThanOrEqual(barBottom);
    // and the bar itself keeps clear of both
    expect(barTop).toBeGreaterThan(rect.y);
    expect(barBottom).toBeLessThan(rect.y + rect.height);
  });

  it('draws the bar without labels when they are switched off', () => {
    const nodes = drawn((layer) => renderGradientLegend(layer, rect, info, theme, { label: { enabled: false } }));

    expect(nodes.filter((node) => node instanceof Text)).toEqual([]);
    expect(nodes.length).toBeGreaterThan(0);
  });
});

describe('gradientLegendExtent', () => {
  it('reserves room for the labels of both sides by default', () => {
    expect(gradientLegendExtent()).toBe(GRADIENT_LEGEND_WIDTH);
    expect(gradientLegendExtent({ position: 'bottom' })).toBe(GRADIENT_LEGEND_HEIGHT);
  });

  it('shrinks to the bar itself once the labels are off', () => {
    expect(gradientLegendExtent({ label: { enabled: false } })).toBe(12);
    expect(gradientLegendExtent({ thickness: 20, label: { enabled: false } })).toBe(20);
  });

  it('measures the ends it is going to draw rather than guess at them', () => {
    // the ends cap the bar, so the strip is as wide as the wider of the two — 10px per character
    const extent = gradientLegendExtent({}, metrics);
    expect(extent).toBe(String(info.max).length * 10);
  });

  it('follows the formatter, so short ends leave the plot the room', () => {
    const extent = gradientLegendExtent({ label: { formatter: () => '9M' } }, metrics);
    expect(extent).toBe(20);
    expect(extent).toBeLessThan(GRADIENT_LEGEND_WIDTH);
  });

  it('never goes narrower than the bar, however short the ends are', () => {
    expect(gradientLegendExtent({ thickness: 40, label: { formatter: () => '9M' } }, metrics)).toBe(40);
  });

  it('costs a horizontal scale nothing across: its ends sit beside the bar', () => {
    expect(gradientLegendExtent({ position: 'bottom' }, metrics)).toBe(12);
    expect(gradientLegendExtent({ position: 'bottom', thickness: 30 }, metrics)).toBe(30);
  });

  it('treats top like bottom and left like right', () => {
    expect(gradientLegendExtent({ position: 'top' }, metrics)).toBe(gradientLegendExtent({ position: 'bottom' }, metrics));
    expect(gradientLegendExtent({ position: 'left' }, metrics)).toBe(gradientLegendExtent({ position: 'right' }, metrics));
  });
});

describe('gradientLegendHorizontal', () => {
  it('lays the bar along x above and below the plot, along y beside it', () => {
    expect([gradientLegendHorizontal('top'), gradientLegendHorizontal('bottom')]).toEqual([true, true]);
    expect([gradientLegendHorizontal('left'), gradientLegendHorizontal('right')]).toEqual([false, false]);
    // right is the default side
    expect(gradientLegendHorizontal(undefined)).toBe(false);
  });
});
