import { binCountFor, binEdges, binIndexOf } from './bins';
import { describe, expect, it } from 'vitest';

/** 0..99, one of each — a flat sample with an easy IQR. */
const uniform = Array.from({ length: 100 }, (_, i) => i);
const widths = (edges: Array<{ x0: number; x1: number }>): number[] => edges.map(({ x0, x1 }) => Number((x1 - x0).toFixed(10)));

describe('bin grid', () => {
  it('rounds the step to a readable number instead of splitting the extent', () => {
    // 0..37 over 5 bins would step by 7.4; the nice grid steps by 10
    const edges = binEdges([0, 37], { binCount: 5 });
    expect(edges.map((edge) => edge.x0)).toEqual([0, 10, 20, 30]);
    expect(edges.at(-1)!.x1).toBe(40);
  });

  it('gives back exactly binCount bins over the data extent when nice is off', () => {
    const edges = binEdges([0, 37], { binCount: 5, nice: false });
    expect(edges).toHaveLength(5);
    expect(edges[0]!.x0).toBe(0);
    expect(edges.at(-1)!.x1).toBe(37);
    expect(new Set(widths(edges))).toEqual(new Set([7.4]));
  });

  it('follows binWidth exactly — the step is the intent, the count follows', () => {
    const edges = binEdges([3, 27], { binWidth: 5 });
    expect(edges[0]!.x0).toBe(0);
    expect(edges.at(-1)!.x1).toBe(30);
    expect(widths(edges)).toEqual([5, 5, 5, 5, 5, 5]);
  });

  it('aligns the grid to binOrigin', () => {
    const edges = binEdges([3, 27], { binWidth: 5, binOrigin: 1 });
    expect(edges[0]!.x0).toBe(1);
    expect(edges.at(-1)!.x1).toBe(31);
  });

  it('keeps fractional edges free of floating-point dust', () => {
    const edges = binEdges([0, 1], { binWidth: 0.1 });
    expect(edges.map((edge) => edge.x1)).toContain(0.3);
    expect(edges.map((edge) => edge.x1)).toContain(0.7);
  });

  it('takes explicit bins as they are, in the order given', () => {
    const edges = binEdges(uniform, {
      bins: [
        [0, 18],
        [18, 65],
        [65, 120],
      ],
      binCount: 4,
    });
    expect(edges).toEqual([
      { x0: 0, x1: 18 },
      { x0: 18, x1: 65 },
      { x0: 65, x1: 120 },
    ]);
  });

  it('bins the domain, not the data, when a domain is given', () => {
    const edges = binEdges([5, 6, 7], { domain: [0, 100], binWidth: 25 });
    expect(edges).toHaveLength(4);
    expect(edges.at(-1)!.x1).toBe(100);
  });

  it('wraps a single distinct value in one bin', () => {
    expect(binEdges([7, 7, 7])).toEqual([{ x0: 6.5, x1: 7.5 }]);
  });

  it('has nothing to draw without numbers', () => {
    expect(binEdges([])).toEqual([]);
    expect(binEdges([NaN, Infinity])).toEqual([]);
  });

  it('refuses to build a grid dense enough to hang the render', () => {
    // 1e-6 over a span of 1000 asks for a billion bins
    const edges = binEdges([0, 1000], { binWidth: 1e-6 });
    expect(edges).toHaveLength(1000);
    expect(edges.at(-1)!.x1).toBe(1000);
  });
});

describe('bin count rules', () => {
  it('sturges counts by the log of the sample', () => {
    expect(binCountFor('sturges', uniform, [0, 99])).toBe(8);
  });

  it('rice counts by its cube root', () => {
    expect(binCountFor('rice', uniform, [0, 99])).toBe(10);
  });

  it('scott and fd read the spread, so a tight sample gets fewer bins', () => {
    const tight = uniform.map((value) => value / 10);
    expect(binCountFor('fd', tight, [0, 9.9])).toBe(binCountFor('fd', uniform, [0, 99]));
    expect(binCountFor('scott', uniform, [0, 99])).toBeGreaterThan(1);
  });

  it('auto never drops below sturges, however degenerate the quartiles are', () => {
    const spike = [...new Array(80).fill(5), ...uniform.slice(0, 20)];
    expect(binCountFor('auto', spike, [0, 19])).toBeGreaterThanOrEqual(binCountFor('sturges', spike, [0, 19]));
  });

  it('falls back to a single bin for a sample that cannot be spread', () => {
    expect(binCountFor('auto', [4], [4, 4])).toBe(1);
    expect(binCountFor('fd', [4, 4, 4], [4, 4])).toBe(1);
  });

  it('is what an unset binCount uses', () => {
    const auto = binEdges(uniform);
    const explicit = binEdges(uniform, { binCount: binCountFor('auto', uniform, [0, 99]) });
    expect(auto).toEqual(explicit);
  });
});

describe('which bin a value lands in', () => {
  const edges = binEdges([0, 30], { binWidth: 10 }); // [0,10) [10,20) [20,30]

  it('sends an edge value to the bin on its right', () => {
    expect(binIndexOf(10, edges)).toBe(1);
    expect(binIndexOf(9.999, edges)).toBe(0);
  });

  it('sends it left instead when the bins are right-closed', () => {
    expect(binIndexOf(10, edges, { binInclusive: 'right' })).toBe(0);
    expect(binIndexOf(0, edges, { binInclusive: 'right' })).toBe(0);
  });

  it('keeps the outermost value: the last bin is closed on both ends', () => {
    expect(binIndexOf(30, edges)).toBe(2);
  });

  it('drops what lies outside', () => {
    expect(binIndexOf(-1, edges)).toBe(-1);
    expect(binIndexOf(31, edges)).toBe(-1);
    expect(binIndexOf(NaN, edges)).toBe(-1);
  });

  it('piles outliers into the edge bins when asked to', () => {
    expect(binIndexOf(-100, edges, { outliers: 'clamp' })).toBe(0);
    expect(binIndexOf(100, edges, { outliers: 'clamp' })).toBe(2);
  });

  it('measures against the domain, not the grid, when both are set', () => {
    const options = { domain: [0, 25] as [number, number], binWidth: 10 };
    const grid = binEdges([0, 25], options); // reaches 30, past the domain
    expect(binIndexOf(27, grid, options)).toBe(-1);
    expect(binIndexOf(27, grid, { ...options, outliers: 'clamp' as const })).toBe(2);
  });
});

describe('calendar bins', () => {
  const utc = (year: number, month: number, day = 1, hour = 0) => Date.UTC(year, month, day, hour);
  const starts = (edges: Array<{ x0: number; x1: number }>): string[] => edges.map((edge) => new Date(edge.x0).toISOString());

  it('a month bin is as long as its own month', () => {
    const edges = binEdges([utc(2025, 0, 15), utc(2025, 2, 3)], { binWidth: 'month' });
    expect(starts(edges)).toEqual(['2025-01-01T00:00:00.000Z', '2025-02-01T00:00:00.000Z', '2025-03-01T00:00:00.000Z']);
    // February is three days shorter than January, and its bin is too
    expect(widths(edges)).toEqual([31 * 86400000, 28 * 86400000, 31 * 86400000]);
  });

  it('a value on a boundary opens its own period rather than closing the one before', () => {
    const edges = binEdges([utc(2025, 0, 1), utc(2025, 1, 1)], { binWidth: 'month' });
    expect(edges).toHaveLength(2);
    expect(binIndexOf(utc(2025, 1, 1), edges)).toBe(1);
  });

  it('quarters and years step by three months and twelve', () => {
    const quarters = binEdges([utc(2025, 1, 10), utc(2025, 8, 2)], { binWidth: 'quarter' });
    expect(starts(quarters)).toEqual(['2025-01-01T00:00:00.000Z', '2025-04-01T00:00:00.000Z', '2025-07-01T00:00:00.000Z']);
    const years = binEdges([utc(2023, 5, 1), utc(2025, 0, 1)], { binWidth: 'year' });
    expect(starts(years)).toEqual(['2023-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z']);
  });

  it('a week starts on Monday', () => {
    // 2025-01-15 is a Wednesday; its week starts on the 13th
    const edges = binEdges([utc(2025, 0, 15), utc(2025, 0, 22)], { binWidth: 'week' });
    expect(starts(edges)).toEqual(['2025-01-13T00:00:00.000Z', '2025-01-20T00:00:00.000Z']);
  });

  it('days and hours are grids of their own', () => {
    const days = binEdges([utc(2025, 0, 1, 9), utc(2025, 0, 2, 21)], { binWidth: 'day' });
    expect(starts(days)).toEqual(['2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z']);
    const hours = binEdges([utc(2025, 0, 1, 9), utc(2025, 0, 1, 11)], { binWidth: 'hour' });
    expect(hours).toHaveLength(3);
  });

  it('a grain far finer than the range steps by whole units instead of asking for millions of bars', () => {
    // seconds across a year: the step grows, the grid still covers the range
    const edges = binEdges([utc(2025, 0, 1), utc(2026, 0, 1)], { binWidth: 'second' });
    expect(edges.length).toBeLessThanOrEqual(1000);
    expect(edges.at(-1)!.x1).toBeGreaterThanOrEqual(utc(2026, 0, 1));
  });

  it('one moment still gets a bin of its own', () => {
    const edges = binEdges([utc(2025, 0, 15)], { binWidth: 'month' });
    expect(starts(edges)).toEqual(['2025-01-01T00:00:00.000Z']);
  });

  it('explicit bins still win over a calendar grain', () => {
    const edges = binEdges([utc(2025, 0, 15)], { binWidth: 'month', bins: [[0, 10]] });
    expect(edges).toEqual([{ x0: 0, x1: 10 }]);
  });
});
