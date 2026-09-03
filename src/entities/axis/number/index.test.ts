import { NumberAxis, type NumberAxisOptions } from './index';
import type { AxisEnv, AxisPosition, LayoutRect, ThemeContext } from '@/shared/kernel';
import { Group, Text } from '@/shared/scene';
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

const plot: LayoutRect = { x: 40, y: 20, width: 400, height: 300 };
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function axis(options: Partial<NumberAxisOptions>, position: AxisPosition, domain: number[] = [0, 100]): NumberAxis {
  const env: AxisEnv = { position, theme };
  const instance = new NumberAxis({ type: 'number', ...options }, env);
  instance.setDomain(domain);
  instance.layout(plot);
  return instance;
}

describe('labels hanging over the ends of the axis', () => {
  it('asks for half of the outermost label on a horizontal axis', () => {
    // the domain ends sit on the plot edges, so the first and last labels are half outside
    const overflow = axis({}, 'bottom').labelOverflow(measureText, plot);
    expect(overflow.left).toBeCloseTo(measureText('0') / 2, 6);
    expect(overflow.right).toBeCloseTo(measureText('100') / 2, 6);
    expect(overflow.top).toBe(0);
    expect(overflow.bottom).toBe(0);
  });

  it('asks for half a line at the top and the bottom of a vertical axis', () => {
    const overflow = axis({ label: { fontSize: 12 } }, 'left').labelOverflow(measureText, plot);
    expect(overflow.top).toBeCloseTo(6, 6);
    expect(overflow.bottom).toBeCloseTo(6, 6);
    // along the axis the label zone measure() reserved already holds them
    expect(overflow.left).toBe(0);
    expect(overflow.right).toBe(0);
  });

  it('counts the formatted label, not the raw value', () => {
    const overflow = axis({ label: { formatter: ({ value }) => `${value} units` } }, 'bottom').labelOverflow(measureText, plot);
    expect(overflow.right).toBeCloseTo(measureText('100 units') / 2, 6);
  });

  it('asks for nothing while the ticks stay clear of the ends', () => {
    // a domain that no tick lands on: the outermost labels sit inside the plot
    const overflow = axis({ min: -13, max: 117, nice: false }, 'bottom').labelOverflow(measureText, plot);
    expect(overflow.left).toBe(0);
    expect(overflow.right).toBe(0);
  });
});

describe('nice bounds', () => {
  const tall: LayoutRect = { x: 0, y: 0, width: 600, height: 800 };
  const data = [0, 156_800_000];

  it('does not depend on whether a layout has already run', () => {
    const env: AxisEnv = { position: 'left', theme };

    const fresh = new NumberAxis({ type: 'number' }, env);
    fresh.setDomain(data);
    fresh.layout(tall);

    // the same axis reached through the other order: layout first, domain second
    const settled = new NumberAxis({ type: 'number' }, env);
    settled.layout(tall);
    settled.setDomain(data);

    expect(fresh.scale.domain).toEqual(settled.scale.domain);
    // the tick count the range asks for, not the two ticks a rangeless scale implies
    expect(fresh.scale.domain[1]).toBe(160_000_000);
  });

  it('rounds off the data extent, never off the previous nice bounds', () => {
    const axis = new NumberAxis({ type: 'number' }, { position: 'left', theme });
    axis.setDomain(data);
    axis.layout(tall);
    const settledDomain = [...axis.scale.domain];

    // a second layout at the same size must be a no-op
    axis.layout(tall);
    expect([...axis.scale.domain]).toEqual(settledDomain);
  });

  it('keeps an explicit min/max out of the rounding', () => {
    const axis = new NumberAxis({ type: 'number', min: 0, max: 150_000_000 }, { position: 'left', theme });
    axis.setDomain(data);
    axis.layout(tall);
    expect(axis.scale.domain).toEqual([0, 150_000_000]);
  });
});

describe('ticks against the axis length', () => {
  /** Labels the axis actually draws at the given height. */
  function gridLabels(height: number, domain = [0, 156_800_000]): string[] {
    const axis = new NumberAxis({ type: 'number' }, { position: 'left', theme });
    axis.setDomain(domain);
    const rect: LayoutRect = { x: 0, y: 0, width: 600, height };
    axis.layout(rect);
    const layer = new Group();
    const labels: string[] = [];
    layer.append = ((...appended) => {
      for (const node of appended) if (node instanceof Text) labels.push(node.text);
      return layer;
    }) as typeof layer.append;
    axis.render(layer, new Group(), rect);
    return labels;
  }

  it('still adds ticks when the axis grows enough to earn them', () => {
    expect(gridLabels(300).length).toBeLessThan(gridLabels(800).length);
    expect(gridLabels(800).length).toBeLessThan(gridLabels(2000).length);
  });

  it('keeps at least two ticks on a tiny axis', () => {
    expect(gridLabels(40).length).toBeGreaterThanOrEqual(2);
  });
});

describe('a format too coarse for the step', () => {
  /** What an application hands the axis: a compact format that keeps no fraction at all. */
  const compact = ({ value }: { value: unknown }) => {
    const number = Number(value);
    if (Math.abs(number) >= 1e6) return `${Math.round(number / 1e6)}M`;
    if (Math.abs(number) >= 1e3) return `${Math.round(number / 1e3)}k`;
    return String(number);
  };

  /** Labels the axis draws down a tall left edge, where ticks come thick. */
  function labels(options: Partial<NumberAxisOptions>, height = 1300, domain = [0, 3_600_000]): string[] {
    const instance = new NumberAxis({ type: 'number', ...options }, { position: 'left', theme });
    instance.setDomain(domain);
    const rect: LayoutRect = { x: 0, y: 0, width: 600, height };
    instance.layout(rect);
    const layer = new Group();
    const drawn: string[] = [];
    layer.append = ((...appended) => {
      for (const node of appended) if (node instanceof Text) drawn.push(node.text);
      return layer;
    }) as typeof layer.append;
    instance.render(layer, new Group(), rect);
    return drawn;
  }

  it('steps up to the scale its own labels can carry', () => {
    // 200 000 apart, the format prints «1M» five times over; a million apart it reads
    const printed = labels({ label: { formatter: compact } });
    expect(printed).toEqual(['0', '1M', '2M', '3M']);
  });

  it('keeps every tick once the format can tell them apart', () => {
    const oneDecimal = ({ value }: { value: unknown }) => `${(Number(value) / 1e6).toFixed(1)}M`;
    const printed = labels({ label: { formatter: oneDecimal } });
    expect(printed.length).toBe(19);
    expect(new Set(printed).size).toBe(printed.length);
  });

  it('leaves the values the caller listed alone, repeats and all', () => {
    const printed = labels({ label: { formatter: compact }, interval: { values: [1_000_000, 1_200_000, 1_400_000] } });
    expect(printed).toEqual(['1M', '1M', '1M']);
  });

  it('walks between two scales without either of them repeating itself', () => {
    const instance = new NumberAxis({ type: 'number', label: { formatter: compact } }, { position: 'left', theme });
    instance.setDomain([0, 3_600_000]);
    instance.layout({ x: 0, y: 0, width: 600, height: 1300 });
    instance.setTransitionDomain([0, 2_000_000], 0.5);
    const layer = new Group();
    const drawn: string[] = [];
    layer.append = ((...appended) => {
      for (const node of appended) if (node instanceof Text) drawn.push(node.text);
      return layer;
    }) as typeof layer.append;
    instance.render(layer, new Group(), { x: 0, y: 0, width: 600, height: 1300 });
    expect(new Set(drawn).size).toBe(drawn.length);
  });
});

describe('domain of a frame partway through an update', () => {
  it('the bounds walk from where the axis stood to where the data arrives', () => {
    const instance = axis({}, 'left', [0, 80]);
    instance.setTransitionDomain([0, 40], 0.5);
    expect(instance.scale.domain).toEqual([0, 60]);
    instance.setTransitionDomain([0, 40], 1);
    expect(instance.scale.domain).toEqual([0, 80]);
  });

  it('both scales are on the axis while it walks: the old ticks fade out as the new fade in', () => {
    const instance = axis({}, 'left', [0, 80]);
    // 0/20/40 belong to both scales, 10/30 only to the one being left, 60/80 only to the settled one
    instance.setTransitionDomain([0, 40], 0.9);
    const drawn = new Map(tickNodes(instance).map((tick) => [tick.value, tick.opacity]));
    expect(drawn.get(20)).toBe(1);
    expect(drawn.get(30)).toBeCloseTo(0.1);
    expect(drawn.get(60)).toBeCloseTo(0.9);
    // 80 is past the bounds of this frame; it arrives once the walk brings it in
    expect(drawn.has(80)).toBe(false);
  });

  it('the room a frame asks for is the room the settled scale needs, from the first frame on', () => {
    // 0..800 walking to 0..1000: the label of the top tick is wider, and the
    // tick itself is only reached at the very end
    const partway = axis({}, 'left', [0, 1000]);
    partway.setTransitionDomain([0, 800], 0.05);
    const settled = axis({}, 'left', [0, 1000]);
    expect(partway.measure(measureText)).toBe(settled.measure(measureText));
    expect(partway.labelOverflow?.(measureText, plot)).toEqual(settled.labelOverflow?.(measureText, plot));
  });

  it('round numbers throughout — a frame never prints a value nobody chose', () => {
    const instance = axis({}, 'left', [0, 80]);
    instance.setTransitionDomain([0, 40], 0.37);
    for (const { value } of tickNodes(instance)) expect(value % 10).toBe(0);
  });
});

/** Tick labels the axis prints, with how present each of them is. */
function tickNodes(instance: NumberAxis): Array<{ value: number; opacity: number }> {
  const layer = new Group();
  const nodes: Array<{ value: number; opacity: number }> = [];
  layer.append = ((...appended) => {
    for (const node of appended) {
      if (node instanceof Text && Number.isFinite(Number(node.text))) nodes.push({ value: Number(node.text), opacity: node.opacity });
    }
    return layer;
  }) as typeof layer.append;
  instance.render(layer, new Group(), plot);
  return nodes;
}

describe('an angle the axis picks while the scale is walking', () => {
  /** Rotation of the labels as they are drawn. */
  function tilt(instance: NumberAxis): number {
    const layer = new Group();
    const angles = new Set<number>();
    layer.append = ((...appended) => {
      for (const node of appended) if (node instanceof Text) angles.add(node.rotation);
      return layer;
    }) as typeof layer.append;
    instance.render(layer, new Group(), plot);
    expect(angles.size).toBe(1);
    return [...angles][0]!;
  }

  /** Long enough that the names crowd a 400 px axis and the tilt has to come out. */
  const wordy = { rotation: 'auto' as const, formatter: ({ value }: { value: unknown }) => `${value} thousand units` };

  it('takes the angle from the scale it is settling on, not from the frame it is in', () => {
    const settled = axis({ label: wordy }, 'bottom', [0, 100]);
    const angle = tilt(settled);
    expect(angle).toBeLessThan(0);

    // partway through an update the frame carries the ticks of both scales at
    // once, and a scale walking down from ten times the bounds crowds them: an
    // angle read off that crowd would come and go with the animation
    const walking = axis({ label: wordy }, 'bottom', [0, 100]);
    walking.setTransitionDomain([0, 1000], 0.5);
    expect(tilt(walking)).toBe(angle);
  });
});
