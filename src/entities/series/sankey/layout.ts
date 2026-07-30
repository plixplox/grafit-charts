/**
 * Vertical layout of a sankey: node heights come from their values, but the
 * gaps between nodes and the minimum height of a node do not — those are fixed
 * costs the value scale has to leave room for, or the busiest column grows out
 * of the plot.
 */

/** A node whose value rounds to nothing still has to be visible. */
export const MIN_NODE_HEIGHT = 2;
/** Bisection steps for the value scale — 20 lands well inside a pixel. */
const SCALE_PASSES = 20;

/** Height a column of nodes takes at a given value→px scale. */
export function columnHeight(totals: number[], scale: number, spacing: number): number {
  const nodes = totals.reduce((sum, total) => sum + Math.max(MIN_NODE_HEIGHT, total * scale), 0);
  return nodes + spacing * Math.max(0, totals.length - 1);
}

/**
 * In a column of many nodes the gaps alone can outgrow the plot — then they are
 * the first thing to give way, down to whatever leaves every node its minimum
 * height.
 */
export function fitNodeSpacing(columnTotals: number[][], plotHeight: number, requested: number): number {
  const busiest = Math.max(...columnTotals.map((column) => column.length), 0);
  if (busiest < 2) return requested;
  const room = plotHeight - MIN_NODE_HEIGHT * busiest;
  return Math.max(0, Math.min(requested, room / (busiest - 1)));
}

/**
 * Value→px scale: every column has to fit the plot height and the tightest one
 * decides. The fixed costs are not proportional to the scale, so it is found by
 * bisection rather than by division.
 */
export function fitValueScale(columnTotals: number[][], plotHeight: number, spacing: number): number {
  const fits = (scale: number) => columnTotals.every((column) => columnHeight(column, scale, spacing) <= plotHeight);
  const heaviest = Math.max(...columnTotals.map((column) => column.reduce((sum, total) => sum + total, 0)), 0);
  if (heaviest <= 0) return 0;
  // at this scale the values alone would fill the plot; the fixed costs make it too tall
  let hi = plotHeight / heaviest;
  if (fits(hi)) return hi;
  let lo = 0;
  for (let pass = 0; pass < SCALE_PASSES; pass++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}
