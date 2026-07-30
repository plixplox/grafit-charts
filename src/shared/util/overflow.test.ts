import { maxOverflow, overflowOutside, textBounds } from './overflow';
import type { LayoutRect } from '@/shared/kernel';
import { describe, expect, it } from 'vitest';

const rect: LayoutRect = { x: 100, y: 50, width: 200, height: 100 };

describe('text bounds', () => {
  it('resolves the anchor through the horizontal alignment', () => {
    expect(textBounds(100, 0, 40, 10, 'left', 'top').left).toBe(100);
    expect(textBounds(100, 0, 40, 10, 'center', 'top').left).toBe(80);
    expect(textBounds(100, 0, 40, 10, 'right', 'top').left).toBe(60);
    // canvas spells the same two alignments as start/end
    expect(textBounds(100, 0, 40, 10, 'end', 'top').left).toBe(60);
  });

  it('takes the glyph row as one font size tall, hung off the baseline', () => {
    expect(textBounds(0, 50, 40, 12, 'left', 'top')).toMatchObject({ top: 50, bottom: 62 });
    expect(textBounds(0, 50, 40, 12, 'left', 'middle')).toMatchObject({ top: 44, bottom: 56 });
    expect(textBounds(0, 50, 40, 12, 'left', 'bottom')).toMatchObject({ top: 38, bottom: 50 });
    expect(textBounds(0, 50, 40, 12, 'left', 'alphabetic')).toMatchObject({ top: 38, bottom: 50 });
  });
});

describe('overflow outside a rect', () => {
  it('reports zero on every side while the box fits', () => {
    const bounds = textBounds(150, 80, 40, 12, 'center', 'middle');
    expect(overflowOutside(bounds, rect)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('measures how far the box hangs over each side', () => {
    const bounds = { left: 90, right: 320, top: 40, bottom: 170 };
    expect(overflowOutside(bounds, rect)).toEqual({ top: 10, right: 20, bottom: 20, left: 10 });
  });

  it('merges two demands side by side, keeping the larger of each', () => {
    const a = { top: 4, right: 0, bottom: 2, left: 9 };
    const b = { top: 1, right: 7, bottom: 6, left: 3 };
    expect(maxOverflow(a, b)).toEqual({ top: 4, right: 7, bottom: 6, left: 9 });
  });
});
