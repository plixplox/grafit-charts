/**
 * Value labels of point-shaped marks (line, area, scatter, bubble): they hang
 * off the point by the marker radius, so the same placement math serves both
 * drawing them and telling the layout how much room they need.
 */
import type { LabelFont } from './rect-label';
import type { Insets, LayoutRect, MeasureText } from '@/shared/kernel';
import { maxOverflow, overflowOutside, textBounds, NO_OVERFLOW } from '@/shared/util';

export type PointLabelPlacement = 'top' | 'bottom' | 'left' | 'right' | 'inside';

export interface PlacedPointLabel {
  x: number;
  y: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
}

/** Clearance between the marker edge and its value label. */
export const POINT_LABEL_GAP = 5;

export function placePointLabel(x: number, y: number, placement: PointLabelPlacement, offset: number): PlacedPointLabel {
  return {
    x: x + (placement === 'left' ? -offset : placement === 'right' ? offset : 0),
    y: y + (placement === 'top' ? -offset : placement === 'bottom' ? offset : 0),
    align: placement === 'left' ? 'right' : placement === 'right' ? 'left' : 'center',
    baseline: placement === 'top' ? 'bottom' : placement === 'bottom' ? 'top' : 'middle',
  };
}

/**
 * Room the point labels ask for outside the plot rect. An inside label rides
 * along with its marker and never leaves the plot on its own.
 */
export function pointLabelOverflow(
  marks: Array<{ x: number; y: number; text: string; offset: number }>,
  placement: PointLabelPlacement,
  font: LabelFont,
  plot: LayoutRect,
  measureText: MeasureText,
): Insets {
  if (placement === 'inside') return NO_OVERFLOW;
  const fontSpec = `${font.weight} ${font.size}px ${font.family}`;
  let overflow = NO_OVERFLOW;
  for (const mark of marks) {
    const placed = placePointLabel(mark.x, mark.y, placement, mark.offset);
    const bounds = textBounds(placed.x, placed.y, measureText(mark.text, fontSpec), font.size, placed.align, placed.baseline);
    overflow = maxOverflow(overflow, overflowOutside(bounds, plot));
  }
  return overflow;
}
