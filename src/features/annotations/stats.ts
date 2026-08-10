/**
 * Annotation values the data decides: a mean, a median, a percentile.
 *
 * A reference line at "the average" has to move when the data does, so the
 * option holds the question rather than the answer — `{ stat: 'mean', field }`
 * instead of a number someone recomputed by hand.
 */
import { numericValues } from '@/shared/data';
import type { Datum } from '@/shared/options';

export type AnnotationStat = 'mean' | 'median' | 'min' | 'max' | 'sum' | 'percentile';

export interface ComputedAnnotationValue {
  stat: AnnotationStat;
  /** Data field the statistic is taken over. */
  field: string;
  /** For `stat: 'percentile'` — 0..100 (95 is the p95). */
  percentile?: number;
}

export function isComputedValue(value: unknown): value is ComputedAnnotationValue {
  return typeof value === 'object' && value !== null && typeof (value as ComputedAnnotationValue).stat === 'string';
}

/** Linear-interpolated quantile of an ascending array — the usual definition. */
function quantile(sorted: number[], p: number): number {
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, sorted.length - 1);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
}

/**
 * The number a computed value stands for, or undefined when the field holds
 * nothing numeric — an annotation with nothing to say is left undrawn.
 */
export function computeStat(data: Datum[], value: ComputedAnnotationValue): number | undefined {
  const values = numericValues(data, value.field).filter((entry) => Number.isFinite(entry));
  if (values.length === 0) return undefined;

  switch (value.stat) {
    case 'mean':
      return values.reduce((sum, entry) => sum + entry, 0) / values.length;
    case 'sum':
      return values.reduce((sum, entry) => sum + entry, 0);
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'median':
      return quantile(
        [...values].sort((a, b) => a - b),
        0.5,
      );
    case 'percentile': {
      const percentile = value.percentile ?? 50;
      // a percentile outside 0..100 is a typo, not an extrapolation request
      const clamped = Math.min(100, Math.max(0, percentile));
      return quantile(
        [...values].sort((a, b) => a - b),
        clamped / 100,
      );
    }
  }
}

/**
 * Passes a plain value through and answers a computed one. Undefined means the
 * statistic could not be taken, and the caller skips whatever it was drawing.
 */
export function resolveValue(value: unknown, data: Datum[]): unknown {
  return isComputedValue(value) ? computeStat(data, value) : value;
}
