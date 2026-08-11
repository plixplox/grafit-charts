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
  /**
   * Field holding how many records each row stands for. Pre-aggregated data —
   * one row per bucket with a count beside it — otherwise gets the statistic of
   * the buckets rather than of the records: without weights the median of
   * `[{ms: 10, n: 900}, {ms: 900, n: 1}]` is 455, with them it is 10.
   * Rows with a non-positive or non-numeric weight are left out.
   */
  weightField?: string;
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

/** A value and how many records it stands for. */
interface WeightedValue {
  value: number;
  weight: number;
}

/**
 * Weighted quantile: the value at which the running weight crosses p of the
 * total. No interpolation between neighbours — with a row standing for a
 * thousand records, the answer is one of the values that were actually
 * recorded, which is how BI tools read a bucketed median.
 */
function weightedQuantile(sorted: WeightedValue[], p: number, total: number): number {
  const target = total * p;
  let running = 0;
  for (const entry of sorted) {
    running += entry.weight;
    if (running >= target) return entry.value;
  }
  return sorted[sorted.length - 1]!.value;
}

/**
 * The number a computed value stands for, or undefined when the field holds
 * nothing numeric — an annotation with nothing to say is left undrawn.
 */
export function computeStat(data: Datum[], value: ComputedAnnotationValue): number | undefined {
  if (value.weightField !== undefined) return weightedStat(data, value, value.weightField);

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
 * The same statistic over rows that each stand for many records. `sum` adds up
 * what the records contribute (Σ w·x), and `min`/`max` are unaffected by how
 * many records sit behind a value — only the middle of the distribution moves.
 */
function weightedStat(data: Datum[], value: ComputedAnnotationValue, weightField: string): number | undefined {
  const values = numericValues(data, value.field);
  const weights = numericValues(data, weightField);
  const rows: WeightedValue[] = [];
  let totalWeight = 0;
  values.forEach((entry, index) => {
    const weight = weights[index];
    if (!Number.isFinite(entry) || weight === undefined || !Number.isFinite(weight) || weight <= 0) return;
    rows.push({ value: entry, weight });
    totalWeight += weight;
  });
  if (rows.length === 0) return undefined;

  switch (value.stat) {
    case 'mean':
      return rows.reduce((sum, row) => sum + row.value * row.weight, 0) / totalWeight;
    case 'sum':
      return rows.reduce((sum, row) => sum + row.value * row.weight, 0);
    case 'min':
      return Math.min(...rows.map((row) => row.value));
    case 'max':
      return Math.max(...rows.map((row) => row.value));
    case 'median':
      return weightedQuantile(
        [...rows].sort((a, b) => a.value - b.value),
        0.5,
        totalWeight,
      );
    case 'percentile': {
      const clamped = Math.min(100, Math.max(0, value.percentile ?? 50));
      return weightedQuantile(
        [...rows].sort((a, b) => a.value - b.value),
        clamped / 100,
        totalWeight,
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
