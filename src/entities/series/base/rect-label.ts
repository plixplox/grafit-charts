import type { Pixels } from '@/shared/options';

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
