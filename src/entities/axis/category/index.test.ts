import { CategoryAxis, type CategoryAxisOptions } from './index';
import type { AxisEnv, AxisPosition, ThemeContext, LayoutRect } from '@/shared/kernel';
import { Group, Text } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const theme: ThemeContext = {
  backgroundColor: '#fff',
  foregroundColor: '#000',
  mutedColor: '#888',
  fontFamily: 'sans-serif',
  palette: { fills: [], strokes: [] },
};

const plot: LayoutRect = { x: 40, y: 20, width: 400, height: 300 };
const domain = ['Alfa', 'Bravo', 'Charlie', 'Delta'];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function axis(options: Partial<CategoryAxisOptions>, position: AxisPosition = 'left'): CategoryAxis {
  const env: AxisEnv = { position, theme };
  const instance = new CategoryAxis({ type: 'category', ...options }, env);
  instance.setDomain(domain);
  instance.layout(plot);
  return instance;
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

describe('category axis with inside labels', () => {
  it('reserves no thickness for the plot rect', () => {
    expect(axis({ label: { placement: 'inside' } }).measure(measureText)).toBe(0);
    // ...unlike the default outside placement, where labels and ticks push the plot in
    expect(axis({}).measure(measureText)).toBeGreaterThan(0);
  });

  it('keeps ticks when they are asked for explicitly', () => {
    expect(axis({ label: { placement: 'inside' }, tick: { enabled: true, size: 5 } }).measure(measureText)).toBe(5);
  });

  it('reserves a label row above the first band and fits the gap to the label', () => {
    const inside = axis({ label: { placement: 'inside', fontSize: 12, spacing: 4 } });
    const slot = 12 + 4 * 2;
    expect(inside.scale.range).toEqual([plot.y + slot, plot.y + plot.height]);
    // the gap between two bands is exactly one label row
    const gap = inside.scale.convert('Bravo') - (inside.scale.convert('Alfa') + inside.scale.bandwidth);
    expect(gap).toBeCloseTo(slot, 6);
  });

  it('leaves an explicit paddingInner alone', () => {
    const inside = axis({ paddingInner: 0.5, label: { placement: 'inside' } });
    expect(inside.scale.paddingInner).toBe(0.5);
  });

  it('does not touch the band layout with outside labels', () => {
    const outside = axis({});
    expect(outside.scale.range).toEqual([plot.y, plot.y + plot.height]);
    expect(outside.scale.paddingInner).toBe(0.2);
  });

  it('draws the labels above their band, flush with the start of the value axis', () => {
    const inside = axis({ label: { placement: 'inside', spacing: 4 } });
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    expect(nodes.map((node) => node.text)).toEqual(domain);
    for (const [index, node] of nodes.entries()) {
      expect(node.x).toBe(plot.x + 4);
      expect(node.textAlign).toBe('left');
      expect(node.textBaseline).toBe('bottom');
      expect(node.y).toBeCloseTo(inside.scale.convert(domain[index]) - 4, 6);
    }
  });

  it('draws the labels along the inner edge on a horizontal axis', () => {
    const inside = axis({ label: { placement: 'inside', spacing: 4 } }, 'bottom');
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
