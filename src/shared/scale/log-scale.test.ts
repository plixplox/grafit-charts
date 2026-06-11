import { LogScale } from './log-scale';
import { describe, expect, it } from 'vitest';

describe('LogScale', () => {
  const make = () => {
    const scale = new LogScale();
    scale.domain = [1, 1000];
    scale.range = [0, 300];
    return scale;
  };

  it('convert: logarithmic mapping across decades', () => {
    const scale = make();
    expect(scale.convert(1)).toBeCloseTo(0);
    expect(scale.convert(10)).toBeCloseTo(100);
    expect(scale.convert(100)).toBeCloseTo(200);
    expect(scale.convert(1000)).toBeCloseTo(300);
  });

  it('convert: non-positive values map to range start', () => {
    const scale = make();
    expect(scale.convert(0)).toBe(0);
    expect(scale.convert(-5)).toBe(0);
  });

  it('invert: roundtrip', () => {
    const scale = make();
    expect(scale.invert(scale.convert(50))).toBeCloseTo(50);
  });

  it('nice expands to powers of the base', () => {
    const scale = make();
    scale.domain = [3, 400];
    scale.nice();
    expect(scale.domain).toEqual([1, 1000]);
  });

  it('nice clamps a non-positive domain to positive', () => {
    const scale = make();
    scale.domain = [0, 0.5];
    scale.nice();
    expect(scale.domain).toEqual([1e-9, 1]);
  });

  it('ticks land on powers of the base', () => {
    // An exact power is not lost to FP error (log10(1000) = 2.9999…96)
    expect(make().ticks(5)).toEqual([1, 10, 100, 1000]);
  });

  it('nice does not shrink the domain at exact powers', () => {
    const scale = make();
    scale.domain = [1000, 5000];
    scale.nice();
    expect(scale.domain).toEqual([1000, 10000]);
  });

  it('ticks step across decades for many-decade domains', () => {
    const scale = make();
    scale.domain = [1, 1e8];
    expect(scale.ticks(5)).toEqual([1, 100, 1e4, 1e6, 1e8]);
  });

  it('ticks within a single decade fall back to linear', () => {
    const scale = make();
    scale.domain = [2, 8];
    expect(scale.ticks(5)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it('ticks with a non-positive domain are empty', () => {
    const scale = make();
    scale.domain = [-1, 100];
    expect(scale.ticks(5)).toEqual([]);
  });
});
