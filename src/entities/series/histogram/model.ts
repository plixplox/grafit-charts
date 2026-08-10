/**
 * The numbers behind the bars: bins across, groups within.
 *
 * A histogram with `groupField` is several distributions sharing one bin grid —
 * the grid is built from all the data, so the bars of different groups line up
 * and can be stacked, laid side by side or drawn over each other.
 */
import { binEdges, binIndexOf, type BinEdge, type BinningOptions } from './bins';
import { normalizeValues, type HistogramNormalize } from './normalize';
import { numericValues, uniqueValues } from '@/shared/data';
import type { Datum } from '@/shared/options';

/** How the groups of one bin share the space. */
export type HistogramGroupMode =
  /** Piled on top of each other — the bin total stays readable. */
  | 'stacked'
  /** Piled and scaled to 100 per bin: the composition of every bin. */
  | 'normalized'
  /** Side by side within the bin. */
  | 'grouped'
  /** All from zero, drawn over each other — the shapes are compared. */
  | 'overlay';

/** Whose total a share is a share of. */
export type HistogramNormalizeWithin = 'total' | 'group';

export interface HistogramModelOptions extends BinningOptions {
  xField: string;
  yField?: string;
  aggregation?: 'count' | 'sum' | 'mean';
  normalize?: HistogramNormalize;
  normalizeWithin?: HistogramNormalizeWithin;
  groupField?: string;
  groupMode?: HistogramGroupMode;
}

/** One group's share of one bin. */
export interface BinSlice {
  /** What the bar draws — the aggregate restated by `normalize`. */
  value: number;
  /** The aggregate before normalization. */
  raw: number;
  /** Rows of this group that landed in the bin. */
  count: number;
}

export interface HistogramGroup {
  /** The value of `groupField` this group stands for; undefined without grouping. */
  key: unknown;
  label: string;
  /** Hidden groups keep their place in the legend and draw nothing. */
  hidden: boolean;
  /** One slice per bin, in bin order. */
  slices: BinSlice[];
}

export interface HistogramModel {
  edges: BinEdge[];
  groups: HistogramGroup[];
  /** True when `groupField` split the data — the legend and the tooltip say so. */
  grouped: boolean;
}

/**
 * Overlay exists to compare shapes, and shapes of samples of different sizes
 * are only comparable group by group. Everywhere else the bars are read
 * together, so they share one total.
 */
function normalizeWithinFor(options: HistogramModelOptions): HistogramNormalizeWithin {
  return options.normalizeWithin ?? (options.groupMode === 'overlay' ? 'group' : 'total');
}

function labelFor(key: unknown): string {
  return key === undefined || key === null || key === '' ? '—' : String(key);
}

/**
 * Bins, groups and the value of every slice. `hidden` holds the indices of the
 * groups switched off in the legend: they draw nothing and count towards no
 * total, the way a filtered-out category does in a BI tool.
 */
export function buildModel(data: Datum[], options: HistogramModelOptions, hidden?: ReadonlySet<number>): HistogramModel {
  const xs = numericValues(data, options.xField);
  const edges = binEdges(xs, options);
  const ys = options.yField ? numericValues(data, options.yField) : [];
  const aggregation = options.aggregation ?? (options.yField ? 'sum' : 'count');

  const grouped = options.groupField !== undefined;
  const keys = grouped ? uniqueValues(data, options.groupField!) : [undefined];
  const keyIndex = new Map(keys.map((key, index) => [key, index]));
  const groupOf = grouped ? data.map((datum) => keyIndex.get(datum[options.groupField!]) ?? 0) : undefined;

  const sums = keys.map(() => new Array<number>(edges.length).fill(0));
  const counts = keys.map(() => new Array<number>(edges.length).fill(0));
  xs.forEach((x, index) => {
    const binIndex = binIndexOf(x, edges, options);
    if (binIndex < 0) return;
    const groupIndex = groupOf ? groupOf[index]! : 0;
    counts[groupIndex]![binIndex]! += 1;
    const y = ys[index];
    if (y !== undefined && Number.isFinite(y)) sums[groupIndex]![binIndex]! += y;
  });

  const raw = keys.map((_, groupIndex) =>
    edges.map((__, binIndex) => {
      const count = counts[groupIndex]![binIndex]!;
      const sum = sums[groupIndex]![binIndex]!;
      return aggregation === 'count' ? count : aggregation === 'mean' ? (count ? sum / count : 0) : sum;
    }),
  );

  const isHidden = (groupIndex: number): boolean => hidden?.has(groupIndex) === true;
  const within = normalizeWithinFor(options);
  const grandTotal = raw.reduce(
    (total, groupRaw, groupIndex) => (isHidden(groupIndex) ? total : total + groupRaw.reduce((sum, value) => sum + value, 0)),
    0,
  );

  const normalized = raw.map((groupRaw, groupIndex) => {
    if (isHidden(groupIndex)) return groupRaw.map(() => 0);
    return normalizeValues(groupRaw, edges, options.normalize, within === 'total' ? grandTotal : undefined);
  });
  const values = options.groupMode === 'normalized' ? scaleBinsToHundred(normalized) : normalized;

  return {
    edges,
    grouped,
    groups: keys.map((key, groupIndex) => ({
      key,
      label: grouped ? labelFor(key) : '',
      hidden: isHidden(groupIndex),
      slices: edges.map((_, binIndex) => ({
        value: values[groupIndex]![binIndex]!,
        raw: raw[groupIndex]![binIndex]!,
        count: counts[groupIndex]![binIndex]!,
      })),
    })),
  };
}

/**
 * Each bin's groups rescaled to add up to 100 — a bin with nothing in it stays
 * empty. Copies rather than rewrites: with `normalize: 'none'` these arrays are
 * the raw aggregates themselves, and a tooltip still shows those.
 */
function scaleBinsToHundred(values: number[][]): number[][] {
  const binCount = values[0]?.length ?? 0;
  const totals = Array.from({ length: binCount }, (_, binIndex) => values.reduce((sum, groupValues) => sum + groupValues[binIndex]!, 0));
  return values.map((groupValues) =>
    groupValues.map((value, binIndex) => {
      const total = totals[binIndex]!;
      return total === 0 ? value : (value / total) * 100;
    }),
  );
}
