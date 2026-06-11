import { extent, niceExtent, ticks, tickStep } from './ticks';
import { describe, expect, it } from 'vitest';

describe('tickStep', () => {
  it('rounds the step to 1/2/5×10^n', () => {
    expect(tickStep(0, 1, 5)).toBeCloseTo(0.2);
    expect(tickStep(0, 100, 5)).toBe(20);
    expect(tickStep(0, 10, 5)).toBe(2);
    // raw 250 → error 2.5 ≤ √10 → multiplier 2
    expect(tickStep(0, 1000, 4)).toBe(200);
  });

  it('picks the multiplier by geometric midpoint (√2, √10, √50)', () => {
    // raw 14.4 → error 1.44 > √2 → multiplier 2
    expect(tickStep(0, 72, 5)).toBe(20);
    // raw 14 → error 1.4 < √2 → multiplier 1
    expect(tickStep(0, 70, 5)).toBe(10);
    // raw 40 → error 4 > √10 → multiplier 5
    expect(tickStep(0, 200, 5)).toBe(50);
    // raw 80 → error 8 > √50 → multiplier 10
    expect(tickStep(0, 400, 5)).toBe(100);
  });

  it('degenerate inputs yield step 1', () => {
    expect(tickStep(5, 5, 5)).toBe(1);
    expect(tickStep(0, 10, 0)).toBe(1);
    expect(tickStep(0, 10, -1)).toBe(1);
  });

  it('reversed domain is computed by absolute span', () => {
    expect(tickStep(100, 0, 5)).toBe(20);
  });
});

describe('ticks', () => {
  it('start === stop yields a single tick', () => {
    expect(ticks(7, 7)).toEqual([7]);
  });

  it('integer steps yield exact values', () => {
    expect(ticks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('first tick is the nearest step multiple not below start', () => {
    expect(ticks(-25, 47, 5)).toEqual([-20, 0, 20, 40]);
  });

  it('fractional step: values compared with tolerance (3·0.2 = 0.6000…01 in FP)', () => {
    const result = ticks(0, 1, 5);
    expect(result).toHaveLength(6);
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach((expected, i) => {
      expect(result[i]).toBeCloseTo(expected, 10);
    });
  });

  it('domain end is included via epsilon tolerance', () => {
    expect(ticks(0, 0.3, 3).at(-1)).toBeCloseTo(0.3);
  });
});

describe('niceExtent', () => {
  it('degenerate domain expands around the value', () => {
    expect(niceExtent(0, 0)).toEqual([0, 1]);
    expect(niceExtent(5, 5)).toEqual([2.5, 7.5]);
    expect(niceExtent(-5, -5)).toEqual([-7.5, -2.5]);
  });

  it('expands to bounds that are multiples of the tick step', () => {
    expect(niceExtent(0.3, 9.7, 5)).toEqual([0, 10]);
    expect(niceExtent(3, 97, 5)).toEqual([0, 100]);
  });

  it('an already-nice domain is unchanged', () => {
    expect(niceExtent(0, 100, 5)).toEqual([0, 100]);
  });
});

describe('extent', () => {
  it('empty array and non-finite values yield undefined', () => {
    expect(extent([])).toBeUndefined();
    expect(extent([NaN, Infinity, -Infinity])).toBeUndefined();
  });

  it('a single value yields a degenerate interval', () => {
    expect(extent([3])).toEqual([3, 3]);
  });

  it('non-finite values are skipped', () => {
    expect(extent([5, NaN, -2, Infinity, 7])).toEqual([-2, 7]);
  });
});
