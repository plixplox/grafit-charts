/**
 * The bands a series lays its marks in, taken off whichever scale runs in that
 * direction. A band axis has bands already; a continuous one (time, number) is
 * given the step of the data, and the plot's own length is what a lone point
 * falls back to.
 */
import type { CartesianGeometry } from '@/shared/kernel';
import { bandLayout, type BandLayout } from '@/shared/scale';

/**
 * Bands along one direction of the plot. `span` is the step in axis units the
 * bands are built from where the scale has none of its own; the chart measures
 * one for the category direction, and a series whose other axis carries
 * categories of its own (heatmap) measures that one itself.
 */
export function plotBands(ctx: CartesianGeometry, direction: 'x' | 'y', span: number | undefined): BandLayout {
  const horizontal = direction === 'x';
  return bandLayout(horizontal ? ctx.xScale : ctx.yScale, span, horizontal ? ctx.plot.width : ctx.plot.height);
}

/** Bands along the category direction — the vertical axis when the bars are horizontal. */
export function categoryBands(ctx: CartesianGeometry): BandLayout {
  return plotBands(ctx, ctx.swapped ? 'y' : 'x', ctx.bandSpan);
}
