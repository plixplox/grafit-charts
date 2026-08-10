import { computeStat, isComputedValue, resolveValue } from './stats';
import { describe, expect, it } from 'vitest';

/** Ten latencies with a long tail — the mean and the median part ways. */
const data = [12, 14, 15, 16, 18, 20, 22, 25, 40, 218].map((ms) => ({ ms }));

describe('a statistic taken over a field', () => {
  it('answers the mean', () => {
    expect(computeStat(data, { stat: 'mean', field: 'ms' })).toBe(40);
  });

  it('answers the median, which the tail leaves alone', () => {
    expect(computeStat(data, { stat: 'median', field: 'ms' })).toBe(19);
  });

  it('answers a percentile, interpolating between the neighbours', () => {
    // p95 sits between 40 and 218, nine tenths of the way up
    expect(computeStat(data, { stat: 'percentile', percentile: 95, field: 'ms' })).toBeCloseTo(137.9, 6);
    expect(computeStat(data, { stat: 'percentile', percentile: 0, field: 'ms' })).toBe(12);
    expect(computeStat(data, { stat: 'percentile', percentile: 100, field: 'ms' })).toBe(218);
  });

  it('reads a percentile outside 0–100 as a typo, not an extrapolation', () => {
    expect(computeStat(data, { stat: 'percentile', percentile: 140, field: 'ms' })).toBe(218);
    expect(computeStat(data, { stat: 'percentile', percentile: -5, field: 'ms' })).toBe(12);
  });

  it('defaults a percentile with no number to the median', () => {
    expect(computeStat(data, { stat: 'percentile', field: 'ms' })).toBe(computeStat(data, { stat: 'median', field: 'ms' }));
  });

  it('answers the ends and the total', () => {
    expect(computeStat(data, { stat: 'min', field: 'ms' })).toBe(12);
    expect(computeStat(data, { stat: 'max', field: 'ms' })).toBe(218);
    expect(computeStat(data, { stat: 'sum', field: 'ms' })).toBe(400);
  });

  it('skips the rows whose field is not a number', () => {
    const mixed = [{ ms: 10 }, { ms: 'n/a' }, { ms: null }, { ms: 20 }];
    expect(computeStat(mixed, { stat: 'mean', field: 'ms' })).toBe(15);
  });

  it('has no answer when there is nothing numeric to answer over', () => {
    expect(computeStat([], { stat: 'mean', field: 'ms' })).toBeUndefined();
    expect(computeStat([{ ms: 'n/a' }], { stat: 'median', field: 'ms' })).toBeUndefined();
    expect(computeStat(data, { stat: 'mean', field: 'missing' })).toBeUndefined();
  });
});

describe('telling a computed value from a plain one', () => {
  it('recognizes the descriptor', () => {
    expect(isComputedValue({ stat: 'mean', field: 'ms' })).toBe(true);
  });

  it('leaves numbers, dates and categories alone', () => {
    expect(isComputedValue(42)).toBe(false);
    expect(isComputedValue('Feb')).toBe(false);
    expect(isComputedValue(new Date())).toBe(false);
    expect(isComputedValue(null)).toBe(false);
  });

  it('passes a plain value through and answers a computed one', () => {
    expect(resolveValue(42, data)).toBe(42);
    expect(resolveValue('Feb', data)).toBe('Feb');
    expect(resolveValue({ stat: 'max', field: 'ms' }, data)).toBe(218);
  });
});
