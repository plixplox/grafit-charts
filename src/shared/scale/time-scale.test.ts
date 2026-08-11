import { TimeScale, toTimestamp } from './time-scale';
import { describe, expect, it } from 'vitest';

const DAY = 24 * 60 * 60 * 1000;

describe('toTimestamp', () => {
  it('passes numbers through', () => {
    expect(toTimestamp(123)).toBe(123);
  });

  it('Date yields getTime', () => {
    const date = new Date(Date.UTC(2024, 0, 5));
    expect(toTimestamp(date)).toBe(date.getTime());
  });

  it('parses ISO strings', () => {
    expect(toTimestamp('2024-01-05')).toBe(Date.UTC(2024, 0, 5));
  });

  it('garbage yields NaN', () => {
    expect(toTimestamp('garbage')).toBeNaN();
    expect(toTimestamp(null)).toBeNaN();
    expect(toTimestamp({})).toBeNaN();
  });
});

describe('TimeScale.ticks', () => {
  it('10-day domain: 2-day step from an epoch-aligned boundary', () => {
    const scale = new TimeScale();
    const d0 = Date.UTC(2024, 0, 1);
    scale.domain = [d0, d0 + 10 * DAY];
    const result = scale.ticks(5);
    expect(scale.tickUnit).toBe('day');
    expect(result).toEqual([Date.UTC(2024, 0, 2), Date.UTC(2024, 0, 4), Date.UTC(2024, 0, 6), Date.UTC(2024, 0, 8), Date.UTC(2024, 0, 10)]);
  });

  it('2-hour domain: 30-minute step', () => {
    const scale = new TimeScale();
    const d0 = Date.UTC(2024, 0, 1, 12, 0, 0);
    scale.domain = [d0, d0 + 2 * 60 * 60 * 1000];
    const result = scale.ticks(5);
    expect(scale.tickUnit).toBe('minute');
    expect(result).toEqual([0, 30, 60, 90, 120].map((m) => d0 + m * 60 * 1000));
  });

  it('month-scale domain: ticks on calendar month starts (UTC)', () => {
    const scale = new TimeScale();
    scale.domain = [Date.UTC(2024, 2, 15), Date.UTC(2025, 1, 10)];
    const result = scale.ticks(5);
    expect(scale.tickUnit).toBe('month');
    expect(result).toEqual([Date.UTC(2024, 5, 1), Date.UTC(2024, 8, 1), Date.UTC(2024, 11, 1)]);
  });

  it('multi-year domain: ticks on January 1 (UTC)', () => {
    const scale = new TimeScale();
    scale.domain = [Date.UTC(2019, 5, 1), Date.UTC(2025, 2, 1)];
    const result = scale.ticks(5);
    expect(scale.tickUnit).toBe('year');
    expect(result).toEqual([2020, 2021, 2022, 2023, 2024, 2025].map((y) => Date.UTC(y, 0, 1)));
  });

  it('zero or negative span yields [d0]', () => {
    const scale = new TimeScale();
    scale.domain = [100, 100];
    expect(scale.ticks(5)).toEqual([100]);
  });
});

describe('TimeScale.nice / formatTick', () => {
  it('nice is a no-op: data defines the bounds', () => {
    const scale = new TimeScale();
    scale.domain = [5, 7];
    scale.nice();
    expect(scale.domain).toEqual([5, 7]);
  });

  it('formatTick for the year unit uses the UTC year', () => {
    // The other formatTick branches depend on the host locale/TZ (toLocale*) —
    // they are covered by image tests with TZ=UTC.
    const scale = new TimeScale();
    scale.tickUnit = 'year';
    expect(scale.formatTick(Date.UTC(2024, 0, 1))).toBe('2024');
  });
});
