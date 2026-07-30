import type { Insets, LayoutRect, MeasureText } from '@/shared/kernel';
import type { FontOptions, Pixels } from '@/shared/options';
import { maxOverflow, overflowOutside, textBounds, NO_OVERFLOW } from '@/shared/util';

/** Label placements relative to a rectangle (bar, histogram, waterfall…). */
export type RectLabelPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'inner-top'
  | 'inner-bottom'
  | 'inner-left'
  | 'inner-right'
  | 'inner-top-left'
  | 'inner-top-right'
  | 'inner-bottom-left'
  | 'inner-bottom-right';

export interface PlacedRectLabel {
  x: number;
  y: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  inside: boolean;
}

/** Font of a value label: series options over the theme default. */
export interface LabelFont {
  size: number;
  weight: string;
  family: string;
}

export const DEFAULT_LABEL_FONT_SIZE = 11;

export function labelFont(options: FontOptions | undefined, themeFontFamily: string): LabelFont {
  return {
    size: options?.fontSize ?? DEFAULT_LABEL_FONT_SIZE,
    weight: options?.fontWeight !== undefined ? String(options.fontWeight) : 'normal',
    family: options?.fontFamily ?? themeFontFamily,
  };
}

/**
 * Room the labels of rectangular marks ask for outside the plot rect. Labels
 * placed inside their rectangle never reach further than the mark itself, so
 * only the outer placements count.
 */
export function rectLabelOverflow(
  marks: Array<{ rect: LayoutRect; text: string }>,
  placement: RectLabelPlacement,
  font: LabelFont,
  plot: LayoutRect,
  measureText: MeasureText,
): Insets {
  if (placement === 'center' || placement.startsWith('inner-')) return NO_OVERFLOW;
  const fontSpec = `${font.weight} ${font.size}px ${font.family}`;
  let overflow = NO_OVERFLOW;
  for (const { rect, text } of marks) {
    const placed = placeRectLabel(placement, rect);
    const bounds = textBounds(placed.x, placed.y, measureText(text, fontSpec), font.size, placed.align, placed.baseline);
    overflow = maxOverflow(overflow, overflowOutside(bounds, plot));
  }
  return overflow;
}

/** Label coordinates and alignment; center and inner-… are inside the rectangle. */
export function placeRectLabel(
  placement: RectLabelPlacement,
  rect: { x: number; y: number; width: number; height: number },
  inset: Pixels = 6,
): PlacedRectLabel {
  const inside = placement === 'center' || placement.startsWith('inner-');
  const key = placement === 'center' ? '' : placement.replace('inner-', '');
  const horizontal = key.includes('left') ? 'left' : key.includes('right') ? 'right' : 'center';
  const vertical = key.startsWith('top') ? 'top' : key.startsWith('bottom') ? 'bottom' : 'middle';
  let x = rect.x + rect.width / 2;
  let y = rect.y + rect.height / 2;
  let align: CanvasTextAlign = 'center';
  let baseline: CanvasTextBaseline = 'middle';
  if (inside) {
    if (horizontal === 'left') {
      x = rect.x + inset;
      align = 'left';
    } else if (horizontal === 'right') {
      x = rect.x + rect.width - inset;
      align = 'right';
    }
    if (vertical === 'top') {
      y = rect.y + inset;
      baseline = 'top';
    } else if (vertical === 'bottom') {
      y = rect.y + rect.height - inset;
      baseline = 'bottom';
    }
  } else if (placement === 'left' || placement === 'right') {
    x = placement === 'left' ? rect.x - inset : rect.x + rect.width + inset;
    align = placement === 'left' ? 'right' : 'left';
  } else {
    if (horizontal === 'left') {
      x = rect.x;
      align = 'left';
    } else if (horizontal === 'right') {
      x = rect.x + rect.width;
      align = 'right';
    }
    if (vertical === 'bottom') {
      y = rect.y + rect.height + 4;
      baseline = 'top';
    } else {
      y = rect.y - 4;
      baseline = 'bottom';
    }
  }
  return { x, y, align, baseline, inside };
}
