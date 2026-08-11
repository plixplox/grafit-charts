/**
 * Where the bars of a histogram start and end.
 *
 * Kept apart from the series so the rules can be exercised on plain numbers:
 * the grid is decided by `bins` (explicit edges), `binWidth` (a step, the way
 * BI tools ask for it) or `binCount` (a target, refined into a round step).
 */
import { extent, tickStep } from '@/shared/util';

/** Rule that reads the bin count off the data: the names statistics gave them. */
export type BinRule = 'auto' | 'sturges' | 'fd' | 'scott' | 'rice';

/** Which end of a bin owns a value that lands exactly on the edge. */
export type BinInclusive = 'left' | 'right';

/** What happens to a value outside `domain`. */
export type BinOutliers = 'exclude' | 'clamp';

/**
 * A bin one calendar step wide — the time grain a BI tool asks its warehouse
 * for. Months and quarters are stepped by the calendar rather than by a fixed
 * number of milliseconds, so a February bin is as short as February is.
 */
export type TimeBinUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface BinningOptions {
  /** Explicit edges: [[min,max], ...]. Wins over every other option here. */
  bins?: Array<[number, number]>;
  /** Number of bins, or the rule that picks it. Default `'auto'`. */
  binCount?: number | BinRule;
  /**
   * Bin width. Wins over binCount: the step is the intent, the count follows.
   * A calendar unit (`'month'`, `'week'`, …) bins dates instead of numbers —
   * the values are read as dates and the grid is aligned in UTC, where the
   * ticks of the time axis are.
   */
  binWidth?: number | TimeBinUnit;
  /** Value the grid is aligned to (default 0): edges fall on binOrigin + k·width. */
  binOrigin?: number;
  /** Round the computed step to 1/2/5×10ⁿ (default true; ignored with binWidth). */
  nice?: boolean;
  /** `'left'` — [x0, x1), the last bin closed; `'right'` — (x0, x1], the first one closed. */
  binInclusive?: BinInclusive;
  /** Range to bin; values outside it are ruled by `outliers`. Default — the data extent. */
  domain?: [number, number];
  /** Values outside `domain`: dropped (default) or piled into the edge bins. */
  outliers?: BinOutliers;
}

export interface BinEdge {
  x0: number;
  x1: number;
}

/**
 * No grid this dense is anyone's intent — it is `binWidth: 1e-9` over a wide
 * domain. Past the cap the width grows to whatever covers the domain in this
 * many bins, so nothing is silently left outside the chart.
 */
const MAX_BINS = 1000;

/** Linear-interpolated quantile of an ascending array. */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, sorted.length - 1);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * The bin count a rule asks for over the given span. The rules are the ones
 * numpy.histogram_bin_edges implements, under the same names — `auto` is
 * Freedman–Diaconis with Sturges as the floor, which keeps small samples sane.
 */
export function binCountFor(rule: BinRule, values: number[], [min, max]: [number, number]): number {
  const size = values.length;
  const span = max - min;
  if (size < 2 || span <= 0) return 1;

  const sturges = Math.ceil(Math.log2(size)) + 1;
  /** A rule states a width; the count is how many of them the span holds. */
  const fromWidth = (width: number): number => (width > 0 && Number.isFinite(width) ? Math.ceil(span / width) : sturges);
  const cubeRoot = Math.cbrt(size);

  switch (rule) {
    case 'sturges':
      return sturges;
    case 'rice':
      return Math.ceil(2 * cubeRoot);
    case 'scott':
      return fromWidth((3.49 * standardDeviation(values)) / cubeRoot);
    case 'fd':
      return fromWidth((2 * interquartileRange(values)) / cubeRoot);
    case 'auto':
      // a degenerate IQR (half the sample on one value) sends fd to Sturges anyway
      return Math.max(sturges, fromWidth((2 * interquartileRange(values)) / cubeRoot));
  }
}

function interquartileRange(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return quantile(sorted, 0.75) - quantile(sorted, 0.25);
}

/**
 * Floating point turns 0.1 + 0.2 into an edge nobody wants to read. Rounding to
 * a couple of digits past the step's own magnitude keeps `0.30000000000000004`
 * from reaching an axis label without moving the edge anywhere real.
 */
function snapToStep(value: number, step: number): number {
  if (!Number.isFinite(step) || step === 0) return value;
  const digits = Math.min(15, Math.max(0, -Math.floor(Math.log10(Math.abs(step))) + 2));
  return Number(value.toFixed(digits));
}

/** Bins of equal width covering [min, max], aligned to `origin`. */
function grid(min: number, max: number, step: number, origin: number): BinEdge[] {
  const start = Math.floor((min - origin) / step) * step + origin;
  let count = Math.max(1, Math.ceil((max - start) / step - 1e-9));
  let width = step;
  if (count > MAX_BINS) {
    width = (max - start) / MAX_BINS;
    count = MAX_BINS;
  }
  return Array.from({ length: count }, (_, index) => ({
    x0: snapToStep(start + index * width, width),
    x1: snapToStep(start + (index + 1) * width, width),
  }));
}

/** The calendar grain the bins were asked for, or undefined for a numeric grid. */
export function timeBinUnit(options: BinningOptions): TimeBinUnit | undefined {
  return typeof options.binWidth === 'string' ? options.binWidth : undefined;
}

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
/** The first Monday of the epoch — where a week grid is measured from. */
const MONDAY_EPOCH = Date.UTC(1970, 0, 5);

/** Units of a fixed length; months and up are stepped by the calendar instead. */
const FIXED_UNIT_MS: Partial<Record<TimeBinUnit, number>> = {
  second: SECOND,
  minute: MINUTE,
  hour: HOUR,
  day: DAY,
  week: WEEK,
};

/** Months in one bin of a calendar unit. */
const UNIT_MONTHS: Record<'month' | 'quarter' | 'year', number> = { month: 1, quarter: 3, year: 12 };

/**
 * Bins one calendar step wide covering [min, max], aligned in UTC — the same
 * calendar the ticks of the time axis fall on, so a bar ends where a tick
 * stands. A grain far finer than the range (seconds across a decade) would ask
 * for millions of bars: the step grows by whole units until it fits the cap.
 */
function calendarEdges(min: number, max: number, unit: TimeBinUnit): BinEdge[] {
  const fixed = FIXED_UNIT_MS[unit];
  // the grid of `units` units per bin: where it starts and how many bins it takes.
  // The last unit is a bin of its own — a value landing on a boundary opens the
  // period it starts rather than closing the one before it.
  const grid = (units: number): { start: number; step: number; count: number } => {
    if (fixed !== undefined) {
      const origin = unit === 'week' ? MONDAY_EPOCH : 0;
      const step = fixed * units;
      const start = Math.floor((min - origin) / step) * step + origin;
      return { start, step, count: Math.max(1, Math.floor((max - start) / step) + 1) };
    }
    const step = UNIT_MONTHS[unit as 'month' | 'quarter' | 'year'] * units;
    const first = new Date(min);
    const last = new Date(max);
    const startMonth = Math.floor((first.getUTCFullYear() * 12 + first.getUTCMonth()) / step) * step;
    const months = last.getUTCFullYear() * 12 + last.getUTCMonth() - startMonth;
    return { start: startMonth, step, count: Math.max(1, Math.floor(months / step) + 1) };
  };

  // a grain far finer than the range asks for millions of bars: the step grows
  // by whole units until the grid fits, re-aligning as it goes
  let units = 1;
  let fitted = grid(units);
  while (fitted.count > MAX_BINS) fitted = grid((units = Math.max(units + 1, Math.ceil(fitted.count / MAX_BINS))));

  const { start, step, count } = fitted;
  if (fixed !== undefined) {
    return Array.from({ length: count }, (_, index) => ({ x0: start + index * step, x1: start + (index + 1) * step }));
  }
  const monthStart = (index: number): number => Date.UTC(Math.floor((start + index * step) / 12), (start + index * step) % 12, 1);
  return Array.from({ length: count }, (_, index) => ({ x0: monthStart(index), x1: monthStart(index + 1) }));
}

/**
 * The bin edges for a set of values. Empty when there is nothing to bin —
 * a chart with no bars says more than a chart with one empty one.
 */
export function binEdges(values: number[], options: BinningOptions = {}): BinEdge[] {
  if (options.bins) return options.bins.map(([x0, x1]) => ({ x0: Math.min(x0, x1), x1: Math.max(x0, x1) }));

  const valid = values.filter((value) => Number.isFinite(value));
  const inDomain = options.domain ? valid.filter((value) => value >= options.domain![0] && value <= options.domain![1]) : valid;
  // outside the domain the values still shape nothing: the grid follows the domain
  const bounds = options.domain ?? extent(inDomain);
  if (!bounds) return [];

  const [min, max] = bounds;
  const unit = timeBinUnit(options);
  if (unit) return calendarEdges(min, max, unit);
  const origin = options.binOrigin ?? 0;
  const width = typeof options.binWidth === 'number' && options.binWidth > 0 ? options.binWidth : undefined;
  // one distinct value: a single bin around it, or the cell of the grid it falls in
  if (max === min) return width ? grid(min, max, width, origin) : [{ x0: min - 0.5, x1: min + 0.5 }];
  if (width) return grid(min, max, width, origin);

  const requested = options.binCount ?? 'auto';
  const count = Math.max(1, typeof requested === 'number' ? Math.floor(requested) : binCountFor(requested, inDomain, [min, max]));
  if (options.nice === false) {
    const step = (max - min) / count || 1;
    return Array.from({ length: count }, (_, index) => ({ x0: min + index * step, x1: min + (index + 1) * step }));
  }
  return grid(min, max, tickStep(min, max, count), origin);
}

/**
 * The bin a value belongs to, or -1 when it belongs to none. Edge values go
 * left by default ([x0, x1)), with the outermost bin closed on both sides so
 * the maximum of the data is never lost.
 */
export function binIndexOf(value: number, edges: BinEdge[], options: BinningOptions = {}): number {
  if (!Number.isFinite(value) || edges.length === 0) return -1;
  const last = edges.length - 1;

  if (options.domain) {
    const [low, high] = options.domain;
    if (value < low) return options.outliers === 'clamp' ? 0 : -1;
    if (value > high) return options.outliers === 'clamp' ? last : -1;
  }
  if (value < edges[0]!.x0) return options.outliers === 'clamp' ? 0 : -1;
  if (value > edges[last]!.x1) return options.outliers === 'clamp' ? last : -1;

  const rightClosed = options.binInclusive === 'right';
  for (let index = 0; index <= last; index++) {
    const { x0, x1 } = edges[index]!;
    const fits = rightClosed ? (value > x0 || index === 0) && value <= x1 : value >= x0 && (value < x1 || index === last);
    if (fits) return index;
  }
  return -1;
}
