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

  it('turns the row about its anchor and takes the box it then fills', () => {
    // a quarter turn swaps the two sides of the box, and leaves nothing over
    expect(textBounds(0, 0, 40, 12, 'left', 'top', 90)).toEqual({ left: -12, right: 0, top: 0, bottom: 40 });
    const tilted = textBounds(0, 0, 40, 12, 'right', 'middle', -45);
    // 40 px of text and 12 px of row, laid across the diagonal
    expect(tilted.bottom - tilted.top).toBeCloseTo((40 + 12) * Math.SQRT1_2, 6);
    expect(tilted.right - tilted.left).toBeCloseTo((40 + 12) * Math.SQRT1_2, 6);
    // the text runs up to the left of the anchor, so it hangs below and behind it
    expect(tilted.right).toBeCloseTo(6 * Math.SQRT1_2, 6);
    expect(tilted.top).toBeCloseTo(-6 * Math.SQRT1_2, 6);
  });

  it('leaves a whole turn alone', () => {
    expect(textBounds(100, 0, 40, 10, 'center', 'top', 360)).toEqual(textBounds(100, 0, 40, 10, 'center', 'top'));
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
