import { labelFrame } from './label-frame';
import type { LayoutRect } from '@/shared/kernel';
import { describe, expect, it } from 'vitest';

const plot: LayoutRect = { x: 40, y: 20, width: 400, height: 300 };

describe('the frame the scales run in', () => {
  it('is the plot itself while every label fits', () => {
    expect(labelFrame(plot, { top: 0, right: 0, bottom: 0, left: 0 })).toEqual(plot);
  });

  it('pulls in the side a label sticks out of, and only that side', () => {
    // a bar label reaching 30px past the right edge: the value scale ends 30px earlier
    expect(labelFrame(plot, { top: 0, right: 30, bottom: 0, left: 0 })).toEqual({ x: 40, y: 20, width: 370, height: 300 });
  });

  it('rounds up, so half a pixel of a label still gets a whole one', () => {
    expect(labelFrame(plot, { top: 0, right: 0, bottom: 0, left: 12.2 })).toMatchObject({ x: 53, width: 387 });
  });

  it('keeps half of the plot for the marks when the labels ask for more', () => {
    // 300 + 100 asked for against 400 of width: both sides give up the same share of it
    const frame = labelFrame(plot, { top: 0, right: 100, bottom: 0, left: 300 });
    expect(frame.width).toBeGreaterThanOrEqual(plot.width / 2);
    expect(frame.x - plot.x).toBe(150);
  });

  it('holds the same frame once the labels land on the plot edge', () => {
    // what the layout converges on: the pass that reserved the room measures no overflow
    const settled = labelFrame(plot, { top: 0, right: 30, bottom: 0, left: 0 });
    expect(labelFrame(settled, { top: 0, right: 0, bottom: 0, left: 0 })).toEqual(settled);
  });
});
