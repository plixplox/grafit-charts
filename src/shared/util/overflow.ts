/**
 * Labels are placed by an anchor point, so how much room they need is only
 * known once the anchor, the alignment and the measured width are put
 * together. These helpers turn that into insets the layout can reserve.
 */
import type { Insets, LayoutRect } from '@/shared/kernel';

/** Box in chart coordinates. */
export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const NO_OVERFLOW: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Box a text node covers. The glyph row is taken as one font size tall —
 * a hair more than the letters really are, which is the safe side to err on.
 * `rotation` turns the text about its anchor, degrees clockwise, as the scene
 * draws it; the box is then the upright one the turned row fits into.
 */
export function textBounds(
  x: number,
  y: number,
  width: number,
  fontSize: number,
  align: CanvasTextAlign,
  baseline: CanvasTextBaseline,
  rotation = 0,
): Bounds {
  const left = align === 'center' ? x - width / 2 : align === 'right' || align === 'end' ? x - width : x;
  const top = baseline === 'middle' ? y - fontSize / 2 : baseline === 'top' || baseline === 'hanging' ? y : y - fontSize;
  const upright = { left, right: left + width, top, bottom: top + fontSize };
  if (rotation % 360 === 0) return upright;
  const angle = (rotation * Math.PI) / 180;
  // a right angle comes out of the cosine as a hair rather than a zero, and a
  // box a hair too tall costs a whole pixel once the layout rounds it up
  const cos = square(Math.cos(angle));
  const sin = square(Math.sin(angle));
  const corners = [
    [upright.left, upright.top],
    [upright.right, upright.top],
    [upright.right, upright.bottom],
    [upright.left, upright.bottom],
  ].map(([cx, cy]) => {
    const dx = cx! - x;
    const dy = cy! - y;
    return [x + dx * cos - dy * sin, y + dx * sin + dy * cos] as const;
  });
  const xs = corners.map(([cx]) => cx);
  const ys = corners.map(([, cy]) => cy);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

/** A quarter turn, exactly: what the trigonometry leaves behind is not a length. */
function square(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : value;
}

/** How far the box sticks out of the rect, side by side (0 where it fits). */
export function overflowOutside(bounds: Bounds, rect: LayoutRect): Insets {
  return {
    top: Math.max(0, rect.y - bounds.top),
    right: Math.max(0, bounds.right - (rect.x + rect.width)),
    bottom: Math.max(0, bounds.bottom - (rect.y + rect.height)),
    left: Math.max(0, rect.x - bounds.left),
  };
}

/** Side-by-side maximum: two demands for outside room merge into one. */
export function maxOverflow(a: Insets, b: Insets): Insets {
  return {
    top: Math.max(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
    left: Math.max(a.left, b.left),
  };
}
