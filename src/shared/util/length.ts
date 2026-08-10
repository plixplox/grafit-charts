import type { Length } from '@/shared/options';

/** `'40%'`, with the surrounding spaces a hand-written option tends to carry. */
const PERCENTAGE = /^\s*(-?\d+(?:\.\d+)?)\s*%\s*$/;

/**
 * A length option against the room it is measured in: pixels pass through,
 * a percentage resolves against `basis`. Undefined means "no limit" — nothing
 * was given, the value is malformed, or a percentage was asked of an
 * unbounded basis. Negative values collapse to zero rather than flipping.
 */
export function resolveLength(value: Length | undefined, basis: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : undefined;
  const match = PERCENTAGE.exec(value);
  if (!match || !Number.isFinite(basis)) return undefined;
  return Math.max(0, (Number(match[1]) / 100) * basis);
}
