import { paddingToCss, resolvePadding } from './padding';
import { describe, expect, it } from 'vitest';

describe('resolvePadding', () => {
  it('spreads a single value over all sides', () => {
    expect(resolvePadding(8)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  it('reads a pair as vertical/horizontal', () => {
    expect(resolvePadding([4, 12])).toEqual({ top: 4, right: 12, bottom: 4, left: 12 });
  });

  it('reads a quadruple clockwise from the top', () => {
    expect(resolvePadding([1, 2, 3, 4])).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });

  it('fills the missing sides of the object form with the fallback', () => {
    expect(resolvePadding({ left: 10 }, 2)).toEqual({ top: 2, right: 2, bottom: 2, left: 10 });
  });

  it('falls back entirely when nothing is given', () => {
    expect(resolvePadding(undefined, 6)).toEqual({ top: 6, right: 6, bottom: 6, left: 6 });
    expect(resolvePadding(undefined)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('takes per-side defaults from an object fallback', () => {
    expect(resolvePadding([4], { top: 1, right: 2, bottom: 3, left: 4 })).toEqual({ top: 4, right: 2, bottom: 4, left: 2 });
    expect(resolvePadding({ top: 0 }, { top: 1, right: 2, bottom: 3, left: 4 })).toEqual({ top: 0, right: 2, bottom: 3, left: 4 });
  });
});

describe('paddingToCss', () => {
  it('writes all four sides out in px', () => {
    expect(paddingToCss(8)).toBe('8px 8px 8px 8px');
    expect(paddingToCss([7, 10])).toBe('7px 10px 7px 10px');
    expect(paddingToCss([1, 2, 3, 4])).toBe('1px 2px 3px 4px');
    expect(paddingToCss({ left: 6 })).toBe('0px 0px 0px 6px');
  });
});
