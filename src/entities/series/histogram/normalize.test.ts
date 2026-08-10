import type { BinEdge } from './bins';
import { normalizeValues } from './normalize';
import { describe, expect, it } from 'vitest';

/** Four bins of width 10 holding 1, 2, 5 and 2 rows — ten in all. */
const edges: BinEdge[] = [
  { x0: 0, x1: 10 },
  { x0: 10, x1: 20 },
  { x0: 20, x1: 30 },
  { x0: 30, x1: 40 },
];
const counts = [1, 2, 5, 2];

describe('what a bar height stands for', () => {
  it('is the value itself by default', () => {
    expect(normalizeValues(counts, edges)).toBe(counts);
    expect(normalizeValues(counts, edges, 'none')).toEqual(counts);
  });

  it('percent adds up to a hundred', () => {
    const percent = normalizeValues(counts, edges, 'percent');
    expect(percent).toEqual([10, 20, 50, 20]);
    expect(percent.reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 10);
  });

  it('frequency is the same share on a 0–1 scale', () => {
    expect(normalizeValues(counts, edges, 'frequency')).toEqual([0.1, 0.2, 0.5, 0.2]);
  });

  it('density encloses an area of one', () => {
    const density = normalizeValues(counts, edges, 'density');
    const area = density.reduce((sum, value, index) => sum + value * (edges[index]!.x1 - edges[index]!.x0), 0);
    expect(area).toBeCloseTo(1, 10);
    expect(density[2]).toBeCloseTo(0.05, 10);
  });

  it('density accounts for bins of unequal width', () => {
    // the wide bin holds twice the rows of the narrow one, at the same density
    const uneven: BinEdge[] = [
      { x0: 0, x1: 10 },
      { x0: 10, x1: 30 },
    ];
    const [narrow, wide] = normalizeValues([1, 2], uneven, 'density');
    expect(narrow).toBeCloseTo(wide!, 10);
  });

  it('cumulative runs the totals up from the left', () => {
    expect(normalizeValues(counts, edges, 'cumulative')).toEqual([1, 3, 8, 10]);
  });

  it('cumulative-percent ends at a hundred — the empirical CDF', () => {
    expect(normalizeValues(counts, edges, 'cumulative-percent')).toEqual([10, 30, 80, 100]);
  });

  it('normalizes an empty chart to zeroes rather than NaN', () => {
    const empty = [0, 0, 0, 0];
    for (const mode of ['percent', 'frequency', 'density', 'cumulative-percent'] as const) {
      expect(normalizeValues(empty, edges, mode)).toEqual(empty);
    }
  });

  it('keeps working when the aggregate can go negative', () => {
    // sums of profit and loss: the shares are signed, the total is what it is
    expect(normalizeValues([-2, 4, -2, 10], edges, 'percent')).toEqual([-20, 40, -20, 100]);
    expect(normalizeValues([-2, 4, -2, 10], edges, 'cumulative')).toEqual([-2, 2, 0, 10]);
  });
});
