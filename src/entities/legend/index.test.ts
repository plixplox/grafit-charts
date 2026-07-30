import { Legend, placeLegendBox, resolveLegendItems, type LegendOptions } from './index';
import type { LegendItemDescriptor, ThemeContext } from '@/shared/kernel';
import { describe, expect, it, vi } from 'vitest';

const descriptors: LegendItemDescriptor[] = [
  { seriesId: 'revenue', label: 'Revenue', color: '#3b82f6', visible: true },
  { seriesId: 'costs', label: 'Costs', color: '#ef4444', visible: false, value: '12K' },
];

describe('resolveLegendItems', () => {
  it('maps descriptors 1:1 when no custom data is given', () => {
    expect(resolveLegendItems(undefined, descriptors)).toEqual([
      { seriesId: 'revenue', label: 'Revenue', color: '#3b82f6', visible: true, value: undefined },
      { seriesId: 'costs', label: 'Costs', color: '#ef4444', visible: false, value: '12K' },
    ]);
  });

  it('binds by series id', () => {
    const [item] = resolveLegendItems([{ name: 'Income', series: 'revenue' }], descriptors);
    expect(item).toMatchObject({ label: 'Income', seriesId: 'revenue', visible: true });
  });

  it('falls back to the series name when the id does not match', () => {
    const [item] = resolveLegendItems([{ name: 'Income', series: 'Revenue' }], descriptors);
    expect(item?.seriesId).toBe('revenue');
  });

  it('prefers an id match over a name match', () => {
    const ambiguous: LegendItemDescriptor[] = [
      { seriesId: 'a', label: 'b', color: '#111', visible: true },
      { seriesId: 'b', label: 'a', color: '#222', visible: true },
    ];
    const [item] = resolveLegendItems([{ name: 'x', series: 'b' }], ambiguous);
    expect(item?.seriesId).toBe('b');
  });

  it('leaves an unbound item static and visible', () => {
    const [item] = resolveLegendItems([{ name: 'Note' }], descriptors);
    expect(item).toMatchObject({ label: 'Note', seriesId: undefined, visible: true });
  });

  it('reports an unknown series reference and renders the item static', () => {
    const onUnresolved = vi.fn();
    const items = resolveLegendItems([{ name: 'Ghost', series: 'missing' }, { name: 'Note' }], descriptors, onUnresolved);
    expect(items[0]).toMatchObject({ seriesId: undefined, visible: true });
    expect(onUnresolved).toHaveBeenCalledTimes(1);
    expect(onUnresolved).toHaveBeenCalledWith('missing');
  });

  it('inherits the descriptor colour unless the marker overrides it', () => {
    const [inherited, overridden] = resolveLegendItems(
      [
        { name: 'a', series: 'revenue' },
        { name: 'b', series: 'revenue', marker: { color: '#000' } },
      ],
      descriptors,
    );
    expect(inherited?.color).toBe('#3b82f6');
    expect(overridden?.color).toBe('#000');
  });

  it('propagates hidden state only to bound items', () => {
    const [bound, unbound] = resolveLegendItems([{ name: 'a', series: 'costs' }, { name: 'b' }], descriptors);
    expect(bound?.visible).toBe(false);
    expect(unbound?.visible).toBe(true);
  });

  it('allows several items to bind to one series', () => {
    const items = resolveLegendItems(
      [
        { name: 'a', series: 'costs' },
        { name: 'b', series: 'costs' },
      ],
      descriptors,
    );
    expect(items.map((item) => item.seriesId)).toEqual(['costs', 'costs']);
    expect(items.map((item) => item.visible)).toEqual([false, false]);
  });

  it('binds pie-like sectors by label, not by the bare series id', () => {
    const sectors: LegendItemDescriptor[] = [
      { seriesId: 'pie-0#0', label: 'Chrome', color: '#111', visible: true },
      { seriesId: 'pie-0#1', label: 'Firefox', color: '#222', visible: true },
    ];
    const onUnresolved = vi.fn();
    const items = resolveLegendItems(
      [
        { name: 'FF', series: 'Firefox' },
        { name: 'Pie', series: 'pie-0' },
      ],
      sectors,
      onUnresolved,
    );
    expect(items[0]?.seriesId).toBe('pie-0#1');
    expect(items[1]?.seriesId).toBeUndefined();
    expect(onUnresolved).toHaveBeenCalledWith('pie-0');
  });

  it('carries per-item style overrides through', () => {
    const [item] = resolveLegendItems(
      [{ name: 'a', marker: { size: 14 }, label: { fontWeight: 'bold', color: '#333' }, value: '5' }],
      descriptors,
    );
    expect(item).toMatchObject({ markerSize: 14, labelFont: { fontWeight: 'bold', color: '#333' }, value: '5' });
  });
});

describe('placeLegendBox', () => {
  const rect = { x: 10, y: 20, width: 300, height: 200 };
  const size = { width: 100, height: 40 };

  it('pins corners', () => {
    expect(placeLegendBox('top-left', size, rect)).toEqual({ x: 10, y: 20 });
    expect(placeLegendBox('top-right', size, rect)).toEqual({ x: 210, y: 20 });
    expect(placeLegendBox('bottom-right', size, rect)).toEqual({ x: 210, y: 180 });
    expect(placeLegendBox('left-bottom', size, rect)).toEqual({ x: 10, y: 180 });
  });

  it('centers along the free axis at edge placements', () => {
    expect(placeLegendBox('top', size, rect)).toEqual({ x: 110, y: 20 });
    expect(placeLegendBox('bottom', size, rect)).toEqual({ x: 110, y: 180 });
    expect(placeLegendBox('right', size, rect)).toEqual({ x: 210, y: 100 });
    expect(placeLegendBox('left', size, rect)).toEqual({ x: 10, y: 100 });
  });

  it('insets from the anchored edges', () => {
    expect(placeLegendBox('top-left', size, rect, { x: 8, y: 6 })).toEqual({ x: 18, y: 26 });
    expect(placeLegendBox('bottom-right', size, rect, { x: 8, y: 6 })).toEqual({ x: 202, y: 174 });
  });

  it('shifts right/down along a centered axis', () => {
    expect(placeLegendBox('top', size, rect, { x: 15 })).toEqual({ x: 125, y: 20 });
    expect(placeLegendBox('right', size, rect, { y: -30 })).toEqual({ x: 210, y: 70 });
  });
});

describe('captionObstacle', () => {
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
  const rect = { x: 20, y: 12, width: 360, height: 276 };
  const measureText = (text: string) => text.length * 10;

  const obstacleOf = (options: LegendOptions) => {
    const legend = new Legend(options, theme);
    legend.setItems(descriptors);
    return legend.captionObstacle(rect, measureText);
  };

  it('reports the box a floating legend claims, anchored as its placement says', () => {
    const box = obstacleOf({ floating: true, position: 'top-right' });
    expect(box).toBeDefined();
    expect(box?.y).toBe(rect.y);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBe(rect.x + rect.width);
    expect(box?.height).toBeGreaterThan(0);
  });

  it('accounts for the offset and the background padding', () => {
    const plain = obstacleOf({ floating: true, position: 'top-right' });
    const inset = obstacleOf({ floating: true, position: 'top-right', offset: { x: 10, y: 6 } });
    expect((inset?.x ?? 0) + (inset?.width ?? 0)).toBe(rect.x + rect.width - 10);
    expect(inset?.y).toBe(rect.y + 6);

    const padded = obstacleOf({ floating: true, position: 'top-right', background: { fill: '#fff', padding: 12 } });
    expect(padded?.width).toBe((plain?.width ?? 0) + 24);
    expect(padded?.height).toBe((plain?.height ?? 0) + 24);
  });

  it('is absent for a docked, disabled or opted-out legend', () => {
    expect(obstacleOf({ position: 'top-right' })).toBeUndefined();
    expect(obstacleOf({ floating: true, enabled: false })).toBeUndefined();
    expect(obstacleOf({ floating: true, avoidCaptions: false })).toBeUndefined();
  });

  it('is absent when the legend has no items to show', () => {
    const legend = new Legend({ floating: true }, theme);
    legend.setItems([]);
    expect(legend.captionObstacle(rect, measureText)).toBeUndefined();
  });
});
