import { resolveLength } from './length';
import { describe, expect, it } from 'vitest';

describe('resolveLength', () => {
  it('passes pixels through', () => {
    expect(resolveLength(160, 800)).toBe(160);
    expect(resolveLength(0, 800)).toBe(0);
  });

  it('reads a percentage against the basis', () => {
    expect(resolveLength('40%', 800)).toBe(320);
    expect(resolveLength('12.5%', 800)).toBe(100);
    expect(resolveLength('100%', 800)).toBe(800);
    // spaces a hand-written option tends to carry
    expect(resolveLength(' 40 % ' as '40%', 800)).toBe(320);
  });

  it('leaves the length unlimited when there is nothing to apply', () => {
    expect(resolveLength(undefined, 800)).toBeUndefined();
    expect(resolveLength('40px' as '40%', 800)).toBeUndefined();
    expect(resolveLength('%' as '40%', 800)).toBeUndefined();
    expect(resolveLength(Infinity, 800)).toBeUndefined();
    expect(resolveLength(Number.NaN, 800)).toBeUndefined();
    // a share of an unbounded basis is no limit at all
    expect(resolveLength('40%', Infinity)).toBeUndefined();
  });

  it('collapses a negative length to zero instead of flipping it', () => {
    expect(resolveLength(-20, 800)).toBe(0);
    expect(resolveLength('-10%', 800)).toBe(0);
  });
});
