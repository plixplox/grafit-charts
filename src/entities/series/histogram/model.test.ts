import { buildModel } from './model';
import { describe, expect, it } from 'vitest';

/** Two channels over two bins: web 2/1, app 1/1. */
const data = [
  { value: 1, channel: 'web' },
  { value: 2, channel: 'web' },
  { value: 12, channel: 'web' },
  { value: 3, channel: 'app' },
  { value: 15, channel: 'app' },
];
const binning = { xField: 'value', binWidth: 10, domain: [0, 20] as [number, number] };
const grouped = { ...binning, groupField: 'channel' };

const valuesOf = (model: ReturnType<typeof buildModel>): number[][] =>
  model.groups.map((group) => group.slices.map((slice) => slice.value));

describe('splitting a distribution by a field', () => {
  it('keeps one group, unnamed, when nothing splits it', () => {
    const model = buildModel(data, binning);
    expect(model.grouped).toBe(false);
    expect(model.groups).toHaveLength(1);
    expect(valuesOf(model)).toEqual([[3, 2]]);
  });

  it('takes the groups in the order the data introduces them', () => {
    const model = buildModel(data, grouped);
    expect(model.grouped).toBe(true);
    expect(model.groups.map((group) => group.label)).toEqual(['web', 'app']);
    expect(valuesOf(model)).toEqual([
      [2, 1],
      [1, 1],
    ]);
  });

  it('gives every group the same bins, so the bars line up', () => {
    // 'app' has nothing under 3, but still gets the bin
    const model = buildModel(data, grouped);
    expect(model.edges).toEqual([
      { x0: 0, x1: 10 },
      { x0: 10, x1: 20 },
    ]);
    expect(model.groups.every((group) => group.slices.length === model.edges.length)).toBe(true);
  });

  it('names a group whose key is missing rather than printing undefined', () => {
    const model = buildModel([{ value: 1 }], { ...binning, groupField: 'channel' });
    expect(model.groups[0]!.label).toBe('—');
  });
});

describe('a group switched off in the legend', () => {
  it('draws nothing', () => {
    const model = buildModel(data, grouped, new Set([1]));
    expect(model.groups[1]!.hidden).toBe(true);
    expect(valuesOf(model)[1]).toEqual([0, 0]);
  });

  it('counts towards no total, so the shares restate themselves', () => {
    const model = buildModel(data, { ...grouped, normalize: 'percent' }, new Set([1]));
    // the three remaining rows carry the whole hundred
    expect(valuesOf(model)[0]!.map(Math.round)).toEqual([67, 33]);
  });
});

describe('whose total a share is a share of', () => {
  it('is the whole chart when the bars are read together', () => {
    const model = buildModel(data, { ...grouped, normalize: 'percent' });
    const total = valuesOf(model)
      .flat()
      .reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(100, 10);
  });

  it('is each group on its own under overlay, where shapes are compared', () => {
    const model = buildModel(data, { ...grouped, groupMode: 'overlay', normalize: 'percent' });
    for (const group of valuesOf(model)) {
      expect(group.reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 10);
    }
  });

  it('takes the explicit answer over either default', () => {
    const model = buildModel(data, { ...grouped, groupMode: 'overlay', normalize: 'percent', normalizeWithin: 'total' });
    const total = valuesOf(model)
      .flat()
      .reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(100, 10);
  });
});

describe('groupMode: normalized', () => {
  it('makes every bin add up to a hundred', () => {
    const model = buildModel(data, { ...grouped, groupMode: 'normalized' });
    expect(valuesOf(model)).toEqual([
      [(2 / 3) * 100, 50],
      [(1 / 3) * 100, 50],
    ]);
  });

  it('leaves an empty bin empty rather than dividing by zero', () => {
    const sparse = [{ value: 1, channel: 'web' }];
    const model = buildModel(sparse, { ...grouped, groupMode: 'normalized' });
    expect(valuesOf(model)).toEqual([[100, 0]]);
  });

  it('keeps the raw aggregate beside the share', () => {
    const model = buildModel(data, { ...grouped, groupMode: 'normalized' });
    expect(model.groups.map((group) => group.slices.map((slice) => slice.raw))).toEqual([
      [2, 1],
      [1, 1],
    ]);
  });
});
