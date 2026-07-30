import { CategoryAxis, type CategoryAxisOptions } from './index';
import type { AxisEnv, AxisPosition, ThemeContext, LayoutRect } from '@/shared/kernel';
import { Group, Line, Text } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const theme: ThemeContext = {
  backgroundColor: '#fff',
  foregroundColor: '#000',
  mutedColor: '#888',
  axisColor: '#ddd',
  fontFamily: 'sans-serif',
  palette: { fills: [], strokes: [] },
};

const plot: LayoutRect = { x: 40, y: 20, width: 400, height: 300 };
const domain = ['Alfa', 'Bravo', 'Charlie', 'Delta'];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function axis(options: Partial<CategoryAxisOptions>, position: AxisPosition = 'left', values: unknown[] = domain): CategoryAxis {
  const env: AxisEnv = { position, theme };
  const instance = new CategoryAxis({ type: 'category', ...options }, env);
  instance.setDomain(values);
  instance.layout(plot);
  return instance;
}

/** Gap between two neighbouring bands, px. */
function bandGap(instance: CategoryAxis): number {
  return instance.scale.convert('Bravo') - (instance.scale.convert('Alfa') + instance.scale.bandwidth);
}

/** Nodes appended to a scene layer (Group keeps its children private). */
function capture(): { layer: Group; nodes: Text[] } {
  const layer = new Group();
  const nodes: Text[] = [];
  layer.append = ((...appended) => {
    for (const node of appended) if (node instanceof Text) nodes.push(node);
    return layer;
  }) as typeof layer.append;
  return { layer, nodes };
}

/** Line nodes appended to a scene layer. */
function captureLines(): { layer: Group; lines: Line[] } {
  const layer = new Group();
  const lines: Line[] = [];
  layer.append = ((...appended) => {
    for (const node of appended) if (node instanceof Line) lines.push(node);
    return layer;
  }) as typeof layer.append;
  return { layer, lines };
}

describe('default axis look', () => {
  it('draws the axis line without ticks, in the axis color', () => {
    const axisLayer = captureLines();
    axis({}, 'bottom').render(axisLayer.layer, new Group(), plot);

    expect(axisLayer.lines).toHaveLength(1);
    expect(axisLayer.lines[0]?.stroke).toBe(theme.axisColor);
    // the dash belongs to the grid, not to the axis line
    expect(axisLayer.lines[0]?.lineDash).toBeUndefined();
  });

  it('adds one tick per category when ticks are asked for', () => {
    const axisLayer = captureLines();
    axis({ tick: { enabled: true } }, 'bottom').render(axisLayer.layer, new Group(), plot);

    // the axis line plus the ticks
    expect(axisLayer.lines).toHaveLength(1 + domain.length);
    for (const line of axisLayer.lines) expect(line.stroke).toBe(theme.axisColor);
  });

  it('draws a dashed grid in the axis color', () => {
    const gridLayer = captureLines();
    axis({}, 'bottom').render(new Group(), gridLayer.layer, plot);

    expect(gridLayer.lines).toHaveLength(domain.length);
    for (const grid of gridLayer.lines) {
      expect(grid.stroke).toBe(theme.axisColor);
      expect(grid.lineDash).toEqual([4, 4]);
    }
  });
});

describe('category axis with inside labels', () => {
  it('reserves no thickness for the plot rect', () => {
    expect(axis({ label: { placement: 'inside' } }).measure(measureText)).toBe(0);
    // ...unlike the default outside placement, where the labels push the plot in
    expect(axis({}).measure(measureText)).toBeGreaterThan(0);
  });

  it('reserves the tick length when ticks are asked for explicitly', () => {
    expect(axis({ label: { placement: 'inside' }, tick: { enabled: true, size: 5 } }).measure(measureText)).toBe(5);
  });

  it('reserves a label row above the first band and adds it to the default gap', () => {
    const inside = axis({ label: { placement: 'inside', fontSize: 12, insideGap: 5 } });
    const slot = 12 + 5 * 2;
    expect(inside.scale.range).toEqual([plot.y + slot, plot.y + plot.height]);
    // step = (span + slot) / (count − paddingInner + 2 · paddingOuter) = 300 / 4
    expect(inside.scale.stepSize).toBeCloseTo(75, 6);
    // the label row on top of the default 0.2 gap
    expect(bandGap(inside)).toBeCloseTo(slot + 0.2 * 75, 6);
  });

  it('keeps an explicit paddingInner as a gap of its own on top of the label row', () => {
    const inside = axis({ paddingInner: 0.5, label: { placement: 'inside' } });
    const slot = 11 + 4 * 2;
    expect(bandGap(inside)).toBeCloseTo(slot + 0.5 * inside.scale.stepSize, 6);
  });

  it('does not touch the band layout with outside labels', () => {
    const outside = axis({});
    expect(outside.scale.range).toEqual([plot.y, plot.y + plot.height]);
    expect(outside.scale.paddingInner).toBe(0.2);
    expect(bandGap(outside)).toBeCloseTo(0.2 * outside.scale.stepSize, 6);
  });

  it('keeps the two inside distances apart: the indent from the axis, the gap to the band', () => {
    const inside = axis({ label: { placement: 'inside', insideSpacing: 10, insideGap: 3 } });
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    expect(nodes.map((node) => node.text)).toEqual(domain);
    for (const [index, node] of nodes.entries()) {
      expect(node.x).toBe(plot.x + 10);
      expect(node.textAlign).toBe('left');
      expect(node.textBaseline).toBe('bottom');
      expect(node.y).toBeCloseTo(inside.scale.convert(domain[index]) - 3, 6);
    }
  });

  it('ignores label.spacing — that one is for outside labels', () => {
    const inside = axis({ label: { placement: 'inside', spacing: 30 } });
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    for (const node of nodes) expect(node.x).toBe(plot.x + 4);
  });

  it('centres the labels in the gap with insideAlign: gap', () => {
    const inside = axis({ label: { placement: 'inside', insideAlign: 'gap' } });
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    const gap = inside.scale.stepSize - inside.scale.bandwidth;
    for (const [index, node] of nodes.entries()) {
      expect(node.textBaseline).toBe('middle');
      expect(node.y).toBeCloseTo(inside.scale.convert(domain[index]) - gap / 2, 6);
    }
  });

  it('thins the labels out when a row per band no longer fits', () => {
    const many = Array.from({ length: 40 }, (_, index) => `Item ${index}`);
    const inside = axis({ label: { placement: 'inside' } }, 'left', many);
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    // the row needs 19 px, the step is about 7 — every third label survives
    const stride = Math.ceil(19 / inside.scale.stepSize);
    expect(stride).toBeGreaterThan(1);
    expect(nodes.map((node) => node.text)).toEqual(many.filter((_, index) => index % stride === 0));
  });

  it('keeps every label when avoidCollisions is off', () => {
    const many = Array.from({ length: 40 }, (_, index) => `Item ${index}`);
    const inside = axis({ label: { placement: 'inside', avoidCollisions: false } }, 'left', many);
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    expect(nodes).toHaveLength(many.length);
  });

  it('draws the labels along the inner edge on a horizontal axis', () => {
    const inside = axis({ label: { placement: 'inside', insideSpacing: 4 } }, 'bottom');
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    for (const [index, node] of nodes.entries()) {
      expect(node.x).toBeCloseTo(inside.scale.center(domain[index]), 6);
      expect(node.textAlign).toBe('center');
      expect(node.y).toBe(plot.y + plot.height - 4);
      expect(node.textBaseline).toBe('bottom');
    }
  });
});

describe('gap between categories in px', () => {
  it('holds the gap exactly, whatever the count', () => {
    for (const count of [3, 6]) {
      const values = Array.from({ length: count }, (_, index) => `Item ${index}`);
      const axed = axis({ gap: 24 }, 'left', values);
      const gap = axed.scale.stepSize - axed.scale.bandwidth;
      expect(gap).toBeCloseTo(24, 6);
    }
  });

  it('caps the gap so that a band never vanishes', () => {
    const values = Array.from({ length: 12 }, (_, index) => `Item ${index}`);
    const axed = axis({ gap: 24 }, 'left', values);
    // 24 px would eat 90% of a 26 px step — the cap keeps a band to show
    expect(axed.scale.paddingInner).toBe(0.8);
    expect(axed.scale.bandwidth).toBeCloseTo(0.2 * axed.scale.stepSize, 6);
  });

  it('takes precedence over paddingInner', () => {
    const axed = axis({ paddingInner: 0.5, gap: 10 });
    expect(bandGap(axed)).toBeCloseTo(10, 6);
  });

  it('adds the inside label row on top of it', () => {
    const inside = axis({ gap: 10, label: { placement: 'inside' } });
    const slot = 11 + 4 * 2;
    expect(bandGap(inside)).toBeCloseTo(slot + 10, 6);
  });
});
