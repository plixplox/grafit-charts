/**
 * A polar grid is drawn from its centre outwards, but the category labels sit
 * beyond the outermost ring — so the radius that fits the available area is not
 * known until those labels have been measured. This is where that is settled.
 */
import type { Insets, LayoutRect } from '@/shared/kernel';
import { maxOverflow, overflowOutside, type Bounds, NO_OVERFLOW } from '@/shared/util';

export interface PlacedRimLabel {
  x: number;
  y: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
}

export interface PolarFit {
  centerX: number;
  centerY: number;
  radius: number;
}

/**
 * A label moves inwards by less than the radius gives up — by the sine of its
 * angle — so the fit closes the remaining gap over several passes.
 */
const PASSES = 6;
/** Overhang below this, in px, is not worth another pass. */
const SETTLED = 0.01;
const MIN_RADIUS = 10;
/** Two labels this close read as one; the second one goes. */
const CLEARANCE = 4;

/**
 * Anchor and alignment of a label on a spoke: it reads outwards, so the side
 * of the circle it is on decides where the text starts.
 */
export function placeRimLabel(centerX: number, centerY: number, distance: number, angle: number): PlacedRimLabel {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return {
    x: centerX + sin * distance,
    y: centerY - cos * distance,
    align: Math.abs(sin) < 0.2 ? 'center' : sin > 0 ? 'left' : 'right',
    baseline: cos > 0.6 ? 'bottom' : cos < -0.6 ? 'top' : 'middle',
  };
}

/** Whether two label boxes touch, counting the clearance between them. */
function collide(a: Bounds, b: Bounds, clearance: number): boolean {
  return a.left < b.right + clearance && b.left < a.right + clearance && a.top < b.bottom + clearance && b.top < a.bottom + clearance;
}

/**
 * Indices of the labels that survive decluttering: walking the rim in order,
 * a label is dropped when it would touch the last one kept. Density varies
 * around a circle — labels crowd each other at the sides, where the spokes are
 * closest in y, and have room to spare at the top — so keeping whatever fits
 * beats thinning by a fixed step, which would have to obey the worst spot.
 *
 * `closed` closes the ring: the last survivor is dropped if it runs into the
 * first one. Leave it off for a run of labels that does not wrap around.
 */
export function thinLabels(bounds: Bounds[], options: { closed?: boolean; clearance?: number } = {}): number[] {
  const clearance = options.clearance ?? CLEARANCE;
  const kept: Array<{ index: number; box: Bounds }> = [];
  for (const [index, box] of bounds.entries()) {
    const previous = kept[kept.length - 1];
    if (previous && collide(box, previous.box, clearance)) continue;
    kept.push({ index, box });
  }
  const first = kept[0];
  const last = kept[kept.length - 1];
  if (options.closed && first && last && kept.length > 1 && collide(first.box, last.box, clearance)) kept.pop();
  return kept.map((entry) => entry.index);
}

/**
 * Indices of the boxes that clear everything in `occupied` — and each other.
 * For labels that give way to more important ones: the category names own the
 * rim, the ring values fit in around them.
 */
export function keepClearOf(bounds: Bounds[], occupied: Bounds[], clearance: number = CLEARANCE): number[] {
  const taken = [...occupied];
  const kept: number[] = [];
  for (const [index, box] of bounds.entries()) {
    if (taken.some((other) => collide(box, other, clearance))) continue;
    taken.push(box);
    kept.push(index);
  }
  return kept;
}

/**
 * Largest grid that keeps every label inside `area`. Lopsided overhang — a long
 * label on one side only — is absorbed by nudging the centre, and whatever
 * still hangs over on both sides is taken off the radius.
 */
export function fitPolarGrid(
  area: LayoutRect,
  startRadius: number,
  labelBounds: (centerX: number, centerY: number, radius: number) => Bounds[],
  minRadius: number = MIN_RADIUS,
): PolarFit {
  let centerX = area.x + area.width / 2;
  let centerY = area.y + area.height / 2;
  let radius = Math.max(minRadius, startRadius);

  let previous = Infinity;
  for (let pass = 0; pass < PASSES; pass++) {
    let overflow: Insets = NO_OVERFLOW;
    for (const bounds of labelBounds(centerX, centerY, radius)) {
      overflow = maxOverflow(overflow, overflowOutside(bounds, area));
    }
    const total = overflow.top + overflow.right + overflow.bottom + overflow.left;
    // either everything fits, or the grid has shrunk as far as it usefully can:
    // a label wider than the area itself cannot be helped by a smaller circle
    if (total <= SETTLED || total > previous - SETTLED) break;
    previous = total;
    centerX += (overflow.left - overflow.right) / 2;
    centerY += (overflow.top - overflow.bottom) / 2;
    const shrink = Math.max((overflow.left + overflow.right) / 2, (overflow.top + overflow.bottom) / 2);
    radius = Math.max(minRadius, radius - shrink);
  }
  return { centerX, centerY, radius };
}
