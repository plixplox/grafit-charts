import { BandScale } from './band-scale';
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
