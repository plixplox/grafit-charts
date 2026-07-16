import { BandScale, DEFAULT_GROUP_GAP, groupSlot } from './band-scale';
import { describe, expect, it } from 'vitest';

describe('BandScale', () => {
  // Defaults paddingInner=0.2, paddingOuter=0.1:
  // step = 100 / (3 − 0.2 + 0.2) = 33.33…, bandwidth = step·0.8
  const make = () => new BandScale<string>(['a', 'b', 'c'], [0, 100]);

  it('band geometry with default paddings', () => {
    const scale = make();
    expect(scale.stepSize).toBeCloseTo(100 / 3);
    expect(scale.bandwidth).toBeCloseTo((100 / 3) * 0.8);
    expect(scale.convert('a')).toBeCloseTo((100 / 3) * 0.1);
    expect(scale.convert('b')).toBeCloseTo((100 / 3) * 1.1);
    expect(scale.center('a')).toBeCloseTo((100 / 3) * 0.1 + ((100 / 3) * 0.8) / 2);
  });

  it('empty domain yields zero bandwidth', () => {
    expect(new BandScale([], [0, 100]).bandwidth).toBe(0);
  });

  it('unknown category yields NaN', () => {
    expect(make().convert('x')).toBeNaN();
  });

  it('dates compare by value, not by reference', () => {
    const scale = new BandScale<Date>([new Date(2024, 0, 1)], [0, 100]);
    expect(scale.convert(new Date(2024, 0, 1))).not.toBeNaN();
  });

  it('array categories (grouped) compare by value', () => {
    const scale = new BandScale<unknown>([['2024', 'Q1'], ['2024', 'Q2']], [0, 100]);
    expect(scale.convert(['2024', 'Q2'])).not.toBeNaN();
  });

  it('a number and a string with the same text do not collide', () => {
    const scale = new BandScale<unknown>([1], [0, 100]);
    expect(scale.convert('1')).toBeNaN();
    expect(scale.convert(1)).not.toBeNaN();
  });

  it('ticks returns the domain', () => {
    expect(make().ticks()).toEqual(['a', 'b', 'c']);
  });
});

describe('groupSlot', () => {
  it('a single slot takes the whole band', () => {
    expect(groupSlot(100, undefined)).toEqual({ start: 0, size: 100 });
    expect(groupSlot(100, { index: 0, count: 1 })).toEqual({ start: 0, size: 100 });
  });

  it('slots are separated by the default gap and stay flush with the band edges', () => {
    // step = 100 / (2 − 0.2) = 55.55…, size = step·0.8
    const step = 100 / (2 - DEFAULT_GROUP_GAP);
    const first = groupSlot(100, { index: 0, count: 2 });
    const second = groupSlot(100, { index: 1, count: 2 });
    expect(first.start).toBe(0);
    expect(first.size).toBeCloseTo(step * (1 - DEFAULT_GROUP_GAP));
    expect(second.start).toBeCloseTo(step);
    // gap between neighbours = step·gap, last slot ends at the band edge
    expect(second.start - first.size).toBeCloseTo(step * DEFAULT_GROUP_GAP);
    expect(second.start + second.size).toBeCloseTo(100);
  });

  it('gap 0 splits the band into contiguous slots', () => {
    expect(groupSlot(100, { index: 0, count: 2 }, 0)).toEqual({ start: 0, size: 50 });
    expect(groupSlot(100, { index: 1, count: 2 }, 0)).toEqual({ start: 50, size: 50 });
  });

  it('gap is clamped to keep slots positive', () => {
    expect(groupSlot(100, { index: 0, count: 2 }, 5).size).toBeGreaterThan(0);
    expect(groupSlot(100, { index: 0, count: 2 }, -1)).toEqual({ start: 0, size: 50 });
  });
});
