/**
 * Data processing: value extraction and stacking.
 * Full engine (group/aggregate, hierarchies) — later phases.
 */
import type { StackSegment } from '@/shared/kernel';
import type { Datum } from '@/shared/options';

export function numericValues(data: Datum[], key: string): number[] {
  return data.map((datum) => {
    const value = datum[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
  });
}

export function uniqueValues(data: Datum[], key: string): unknown[] {
  const seen = new Set<unknown>();
  const result: unknown[] = [];
  for (const datum of data) {
    const value = datum[key];
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

export interface StackSeriesDef {
  id: string;
  key: string;
  stackGroup: string;
  /** Normalizes the stack total to this value (e.g. 100 — percentage stack). */
  normalizedTo?: number;
}

/**
 * Cumulative stacking: for each series — y0/y1 arrays by data index.
 * Positive and negative values accumulate separately (diverging stack).
 * With normalizedTo, each category's total is scaled to the given value
 * (positive part — to +normalizedTo, negative — to −normalizedTo).
 */
export function computeStacks(data: Datum[], defs: StackSeriesDef[]): Map<string, StackSegment> {
  const result = new Map<string, StackSegment>();
  const positive = new Map<string, number[]>();
  const negative = new Map<string, number[]>();
  const groupSeries = new Map<string, string[]>();
  const groupNormalized = new Map<string, number>();

  for (const def of defs) {
    const pos = positive.get(def.stackGroup) ?? new Array<number>(data.length).fill(0);
    const neg = negative.get(def.stackGroup) ?? new Array<number>(data.length).fill(0);
    positive.set(def.stackGroup, pos);
    negative.set(def.stackGroup, neg);
    groupSeries.set(def.stackGroup, [...(groupSeries.get(def.stackGroup) ?? []), def.id]);
    if (def.normalizedTo !== undefined && !groupNormalized.has(def.stackGroup)) {
      groupNormalized.set(def.stackGroup, def.normalizedTo);
    }

    const values = numericValues(data, def.key);
    const y0: number[] = new Array(data.length).fill(0);
    const y1: number[] = new Array(data.length).fill(0);
    values.forEach((value, index) => {
      const safe = Number.isFinite(value) ? value : 0;
      const acc = safe >= 0 ? pos : neg;
      const base = acc[index] ?? 0;
      y0[index] = base;
      y1[index] = base + safe;
      acc[index] = base + safe;
    });
    result.set(def.id, { y0, y1 });
  }

  for (const [group, normalizedTo] of groupNormalized) {
    const pos = positive.get(group) ?? [];
    const neg = negative.get(group) ?? [];
    for (const id of groupSeries.get(group) ?? []) {
      const segment = result.get(id);
      if (!segment) continue;
      segment.y0 = segment.y0.map((value, index) => normalize(value, pos[index], neg[index], normalizedTo));
      segment.y1 = segment.y1.map((value, index) => normalize(value, pos[index], neg[index], normalizedTo));
    }
  }
  return result;
}

/** Scales the accumulated value to normalizedTo based on the sign of its stack part. */
function normalize(value: number, posTotal = 0, negTotal = 0, normalizedTo = 100): number {
  if (value > 0) return posTotal > 0 ? (value / posTotal) * normalizedTo : 0;
  if (value < 0) return negTotal < 0 ? (value / Math.abs(negTotal)) * normalizedTo : 0;
  return 0;
}
