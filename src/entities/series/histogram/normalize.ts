/**
 * What the height of a bar stands for: the count itself, its share of the
 * whole, a density, or everything up to here. Same numbers, different question —
 * "how many landed here" versus "how much of the data is below this point".
 */
import type { BinEdge } from './bins';

export type HistogramNormalize =
  /** The aggregated value itself (default). */
  | 'none'
  /** Share of the total, 0–100. */
  | 'percent'
  /** Share of the total, 0–1. */
  | 'frequency'
  /** Share divided by bin width: the bars enclose an area of 1. */
  | 'density'
  /** Running total from the left. */
  | 'cumulative'
  /** Running total as a share of the whole, 0–100 — the empirical CDF. */
  | 'cumulative-percent';

/**
 * Bin values restated in the requested unit. The order is the order of the
 * bins, so the running totals accumulate left to right.
 *
 * `total` is what a share is a share of; by default the values' own sum. A
 * grouped histogram passes the total of every group, so the shares of the
 * groups add up to a hundred across the chart rather than within each group.
 */
export function normalizeValues(values: number[], edges: BinEdge[], mode: HistogramNormalize = 'none', total?: number): number[] {
  if (mode === 'none') return values;

  total ??= values.reduce((sum, value) => sum + value, 0);
  // an empty chart normalizes to zeroes rather than to NaN
  const share = (value: number): number => (total === 0 ? 0 : value / total);

  switch (mode) {
    case 'percent':
      return values.map((value) => share(value) * 100);
    case 'frequency':
      return values.map(share);
    case 'density':
      return values.map((value, index) => {
        const edge = edges[index];
        const width = edge ? edge.x1 - edge.x0 : 0;
        return width > 0 ? share(value) / width : 0;
      });
    case 'cumulative': {
      let running = 0;
      return values.map((value) => (running += value));
    }
    case 'cumulative-percent': {
      let running = 0;
      return values.map((value) => share((running += value)) * 100);
    }
  }
}
