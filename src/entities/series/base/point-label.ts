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
  const fontSpec = `${font.weight} ${font.size}px ${font.family}`;
  return pointBlockOverflow(
    marks.map((mark) => ({ ...mark, width: measureText(mark.text, fontSpec), height: font.size })),
    placement,
    plot,
  );
}

/**
 * The same question for a label made of several runs over several lines: the
 * block has measured its own box, so it hands over width and height instead of
 * a piece of text.
 */
export function pointBlockOverflow(
  marks: Array<{ x: number; y: number; width: number; height: number; offset: number }>,
  placement: PointLabelPlacement,
  plot: LayoutRect,
): Insets {
  if (placement === 'inside') return NO_OVERFLOW;
  let overflow = NO_OVERFLOW;
  for (const mark of marks) {
    const placed = placePointLabel(mark.x, mark.y, placement, mark.offset);
    const bounds = textBounds(placed.x, placed.y, mark.width, mark.height, placed.align, placed.baseline);
    overflow = maxOverflow(overflow, overflowOutside(bounds, plot));
  }
  return overflow;
}

/**
 * Where the centre of a label block goes: `placePointLabel` anchors the text by
 * its baseline, a block is always centred on its own y.
 */
export function pointBlockCenter(placed: PlacedPointLabel, height: number): number {
  if (placed.baseline === 'bottom') return placed.y - height / 2;
  if (placed.baseline === 'top') return placed.y + height / 2;
  return placed.y;
}
