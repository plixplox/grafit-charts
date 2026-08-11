import { ellipsize, Legend, placeLegendBox, resolveLegendItems, type LegendOptions } from './index';
import type { LegendItemDescriptor, ThemeContext } from '@/shared/kernel';
import { Group, Text, type SceneNode } from '@/shared/scene';
import { describe, expect, it, vi } from 'vitest';

const descriptors: LegendItemDescriptor[] = [
  { seriesId: 'revenue', label: 'Revenue', color: '#3b82f6', visible: true },
  { seriesId: 'costs', label: 'Costs', color: '#ef4444', visible: false, value: '12K' },
];

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
      [{ name: 'a', marker: { size: 14, shape: 'diamond' }, label: { fontWeight: 'bold', color: '#333' }, value: '5' }],
      descriptors,
    );
    expect(item).toMatchObject({
      marker: { size: 14, shape: 'diamond' },
      labelFont: { fontWeight: 'bold', color: '#333' },
      value: '5',
    });
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

describe('item layout', () => {
  const measureText = (text: string) => text.length * 10;

  const measure = (options: LegendOptions, width = 1000, height = 300) => {
    const legend = new Legend(options, theme);
    legend.setItems(descriptors);
    return legend.measure(measureText, width, height);
  };

  it('widens the item slot for a line marker', () => {
    const square = measure({}).width;
    const line = measure({ item: { marker: { shape: 'line' } } }).width;
    // 10px box → 18px dash, twice (two items)
    expect(line - square).toBe(16);
  });

  it('scales the row height with the marker size', () => {
    const small = measure({ item: { marker: { size: 10 } } }).height;
    const large = measure({ item: { marker: { size: 24 } } }).height;
    // the label font (12) sets the floor, so only the larger marker moves the row
    expect(large - small).toBe(12);
  });

  it('honours the spacing options', () => {
    const base = measure({}).width;
    expect(measure({ item: { gap: 28 } }).width).toBe(base + 10);
    expect(measure({ item: { markerGap: 16 } }).width).toBe(base + 20);
    // only the second item has a value, so its gap counts once
    expect(measure({ item: { valueGap: 20 } }).width).toBe(base + 6);
  });

  it('accepts the padding shorthands', () => {
    const bare = measure({ background: { fill: '#fff', padding: 0 } });
    const pair = measure({ background: { fill: '#fff', padding: [4, 12] } });
    expect(pair.width - bare.width).toBe(24);
    expect(pair.height - bare.height).toBe(8);

    const sides = measure({ background: { fill: '#fff', padding: [1, 2, 3, 4] } });
    expect(sides.width - bare.width).toBe(6);
    expect(sides.height - bare.height).toBe(4);
  });

  it('paginates a horizontal legend by maxRows', () => {
    // a narrow box forces one item per row
    const twoRows = measure({ maxRows: 2 }, 120);
    const oneRow = measure({ maxRows: 1 }, 120);
    expect(oneRow.height).toBeLessThan(twoRows.height);
  });

  it('lays the items out back to front with reverse', () => {
    const legend = new Legend({ position: 'left-top', reverse: true }, theme);
    legend.setItems(descriptors);
    legend.measure(measureText, 300, 300);
    legend.render(new Group(), { x: 0, y: 0, width: 300, height: 300 });
    // vertical column: the first row is the last descriptor
    expect(legend.hitTest(4, 6)).toBe('costs');
  });
});

describe('captionObstacle', () => {
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

describe('ellipsize', () => {
  const measureText = (text: string) => text.length * 10;

  it('leaves text that fits alone', () => {
    expect(ellipsize('Revenue', 'font', 70, measureText)).toBe('Revenue');
  });

  it('cuts to the room it has and marks the cut', () => {
    // 5 characters of room: 3 of the word plus the two dots of the mark
    expect(ellipsize('Revenue', 'font', 50, measureText)).toBe('Rev..');
  });

  it('falls back to the ellipsis alone when not even one character fits', () => {
    expect(ellipsize('Revenue', 'font', 20, measureText)).toBe('..');
  });

  it('draws nothing at all without room', () => {
    expect(ellipsize('Revenue', 'font', 0, measureText)).toBe('');
  });
});

describe('size limits', () => {
  const measureText = (text: string) => text.length * 10;
  const long: LegendItemDescriptor[] = [
    { seriesId: 'a', label: 'Revenue from subscriptions', color: '#111', visible: true },
    { seriesId: 'b', label: 'Revenue from services', color: '#222', visible: true },
  ];

  /** Label texts the legend actually draws. */
  function labelsOf(options: LegendOptions, items = long, width = 1000, height = 300): string[] {
    const legend = new Legend(options, theme);
    legend.setItems(items);
    legend.measure(measureText, width, height);
    const layer = new Group();
    legend.render(layer, { x: 0, y: 0, width, height });
    const texts = (node: SceneNode): Text[] =>
      node instanceof Text ? [node] : (((node as unknown as { children?: SceneNode[] }).children ?? []).flatMap(texts) as Text[]);
    return texts(layer).map((node) => node.text);
  }

  const measure = (options: LegendOptions, items = long, width = 1000, height = 300) => {
    const legend = new Legend(options, theme);
    legend.setItems(items);
    return legend.measure(measureText, width, height);
  };

  it('keeps a vertical legend within maxWidth', () => {
    const free = measure({ position: 'right' });
    const capped = measure({ position: 'right', maxWidth: 140 });
    expect(free.width).toBeGreaterThan(140);
    expect(capped.width).toBeLessThanOrEqual(140);
  });

  it('cuts the labels that no longer fit rather than the chart', () => {
    expect(labelsOf({ position: 'right', maxWidth: 140 })).toEqual(['Revenue fr..', 'Revenue fr..']);
  });

  it('leaves the labels whole while they fit', () => {
    expect(labelsOf({ position: 'right' })).toEqual(['Revenue from subscriptions', 'Revenue from services']);
  });

  it('wraps a horizontal legend within maxWidth instead of cutting it', () => {
    const oneRow = measure({ position: 'bottom' }).height;
    const wrapped = measure({ position: 'bottom', maxWidth: 320 });
    expect(wrapped.width).toBeLessThanOrEqual(320);
    expect(wrapped.height).toBeGreaterThan(oneRow);
  });

  it('paginates a vertical legend that runs past maxHeight', () => {
    const four = [...long, ...long.map((item) => ({ ...item, seriesId: `${item.seriesId}2` }))];
    const full = measure({ position: 'right' }, four);
    const capped = measure({ position: 'right', maxHeight: 60 }, four);
    expect(capped.height).toBeLessThanOrEqual(60);
    expect(capped.height).toBeLessThan(full.height);
  });

  it('caps the rows of a horizontal legend along with maxRows', () => {
    const items = Array.from({ length: 8 }, (_, index) => ({
      seriesId: `s${index}`,
      label: `Series ${index}`,
      color: '#111',
      visible: true,
    }));
    // narrow enough for one item per row, so maxRows would allow two rows
    const byRows = measure({ position: 'bottom', maxRows: 2 }, items, 140);
    const byHeight = measure({ position: 'bottom', maxRows: 2, maxHeight: 40 }, items, 140);
    expect(byHeight.height).toBeLessThan(byRows.height);
  });

  it('reads a percentage cap against the room the layout offered', () => {
    // 30% of the 1000 the layout hands over — the same limit as the pixel form
    expect(measure({ position: 'right', maxWidth: '30%' })).toEqual(measure({ position: 'right', maxWidth: 300 }));
    expect(labelsOf({ position: 'right', maxWidth: '14%' })).toEqual(labelsOf({ position: 'right', maxWidth: 140 }));
  });

  it('follows the room a percentage cap is read against', () => {
    const wide = measure({ position: 'right', maxWidth: '30%' }, long, 1000);
    const narrow = measure({ position: 'right', maxWidth: '30%' }, long, 600);
    expect(wide.width).toBeGreaterThan(narrow.width);
  });

  it('paginates a horizontal legend within a percentage of the height', () => {
    const items = Array.from({ length: 8 }, (_, index) => ({
      seriesId: `s${index}`,
      label: `Series ${index}`,
      color: '#111',
      visible: true,
    }));
    const byRows = measure({ position: 'bottom', maxRows: 2 }, items, 140, 300);
    // 40 of the 300 the layout offers — the pixel form of the same cap
    const byHeight = measure({ position: 'bottom', maxRows: 2, maxHeight: '13.34%' }, items, 140, 300);
    expect(byHeight.height).toBeLessThan(byRows.height);
    expect(byHeight).toEqual(measure({ position: 'bottom', maxRows: 2, maxHeight: 40 }, items, 140, 300));
  });

  it('ignores a malformed cap instead of collapsing the legend', () => {
    expect(measure({ position: 'right', maxWidth: '160px' as '160%' })).toEqual(measure({ position: 'right' }));
  });

  it('gives the pager its room only once there is a page to reach', () => {
    // exactly two rows' worth of height: without a pager both items are one page
    const rowStep = measure({ position: 'right' }, long).height;
    const tight = measure({ position: 'right', maxHeight: rowStep }, long);
    expect(tight.height).toBe(rowStep);
    expect(labelsOf({ position: 'right', maxHeight: rowStep })).toHaveLength(2);
  });
});
