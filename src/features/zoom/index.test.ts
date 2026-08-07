import { FULL_WINDOW, sliceDomain, windowForCount } from './index';
import { describe, expect, it } from 'vitest';

const domain = (length: number): number[] => Array.from({ length }, (_, index) => index);

describe('windowForCount', () => {
  it('anchors to the start of the domain by default', () => {
    expect(sliceDomain(domain(100), windowForCount(10, 100))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('anchors to the end when asked', () => {
    expect(sliceDomain(domain(100), windowForCount(3, 100, 'end'))).toEqual([97, 98, 99]);
  });

  it('slices exactly the requested count for domains that are not binary fractions', () => {
    for (const total of [7, 13, 31, 49, 365, 1000]) {
      for (const count of [1, 2, 3, 5, 12, 30]) {
        if (count >= total) continue;
        for (const anchor of ['start', 'end'] as const) {
          expect(sliceDomain(domain(total), windowForCount(count, total, anchor))).toHaveLength(count);
        }
      }
    }
  });

  it('keeps the full window when the count covers the domain or makes no sense', () => {
    expect(windowForCount(100, 100)).toEqual(FULL_WINDOW);
    expect(windowForCount(500, 100)).toEqual(FULL_WINDOW);
    expect(windowForCount(0, 100)).toEqual(FULL_WINDOW);
    expect(windowForCount(-5, 100)).toEqual(FULL_WINDOW);
    expect(windowForCount(Number.NaN, 100)).toEqual(FULL_WINDOW);
    expect(windowForCount(10, 0)).toEqual(FULL_WINDOW);
  });

  it('rounds a fractional count down to whole items', () => {
    expect(sliceDomain(domain(20), windowForCount(4.7, 20))).toEqual([0, 1, 2, 3]);
  });
});
