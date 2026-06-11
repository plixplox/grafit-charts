import { LinearScale } from './linear-scale';
import { describe, expect, it } from 'vitest';

describe('LinearScale', () => {
  it('convert: linear mapping from domain to range', () => {
    const scale = new LinearScale([0, 100], [0, 640]);
    expect(scale.convert(0)).toBe(0);
    expect(scale.convert(50)).toBe(320);
    expect(scale.convert(100)).toBe(640);
  });

  it('convert: inverted range', () => {
    const scale = new LinearScale([0, 100], [640, 0]);
    expect(scale.convert(25)).toBe(480);
  });

  it('convert: degenerate domain yields the range midpoint', () => {
    const scale = new LinearScale([5, 5], [0, 640]);
    expect(scale.convert(5)).toBe(320);
    expect(scale.convert(999)).toBe(320);
  });

  it('invert: inverse mapping (roundtrip)', () => {
    const scale = new LinearScale([0, 100], [0, 640]);
    expect(scale.invert(scale.convert(37))).toBeCloseTo(37);
    expect(scale.invert(320)).toBe(50);
  });

  it('invert: degenerate range yields the domain midpoint', () => {
    const scale = new LinearScale([0, 100], [10, 10]);
    expect(scale.invert(10)).toBe(50);
  });

  it('nice mutates the domain to step-multiple bounds', () => {
    const scale = new LinearScale([0.3, 9.7], [0, 1]);
    scale.nice(5);
    expect(scale.domain).toEqual([0, 10]);
  });

  it('ticks matches util-ticks over the domain', () => {
    const scale = new LinearScale([0, 100], [0, 1]);
    expect(scale.ticks(5)).toEqual([0, 20, 40, 60, 80, 100]);
  });
});
