import type { Padding, PaddingValue, Pixels } from './primitives';

/** Renders a padding shorthand as a CSS `padding` value, for the DOM-based parts. */
export function paddingToCss(value: PaddingValue): string {
  const { top, right, bottom, left } = resolvePadding(value);
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

/**
 * Normalizes any padding shorthand into the four sides, CSS-style: `8` and `[8]`
 * → all sides, `[8, 12]` → vertical/horizontal, `[8, 12, 4, 0]` →
 * top/right/bottom/left. Sides missing from the object form fall back to `fallback`.
 */
export function resolvePadding(value: PaddingValue | undefined, fallback: Pixels | Required<Padding> = 0): Required<Padding> {
  const base: Required<Padding> =
    typeof fallback === 'number' ? { top: fallback, right: fallback, bottom: fallback, left: fallback } : fallback;
  if (value === undefined) return { ...base };
  if (typeof value === 'number') return { top: value, right: value, bottom: value, left: value };
  if (Array.isArray(value)) {
    // as in CSS, each missing side copies the one across from it
    const [top = base.top, right = top, bottom = top, left = right] = value;
    return { top, right, bottom, left };
  }
  return {
    top: value.top ?? base.top,
    right: value.right ?? base.right,
    bottom: value.bottom ?? base.bottom,
    left: value.left ?? base.left,
  };
}
