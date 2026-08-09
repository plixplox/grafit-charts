/**
 * A value label sits beside its mark, so the mark has to stop short of the plot
 * edge for the label to stay inside — otherwise it crosses the axis and lands on
 * the tick labels. The scales therefore run in a frame pulled in from the plot
 * by exactly the room the labels asked for.
 */
import type { Insets, LayoutRect } from '@/shared/kernel';

/** A label that could never fit gives up: the scales keep at least this share of the plot. */
const MIN_SCALE_SPAN = 0.5;

/** Room the two ends of one direction get, cut back proportionally when over budget. */
function reserve(near: number, far: number, size: number): [number, number] {
  const start = Math.ceil(Math.max(0, near));
  const end = Math.ceil(Math.max(0, far));
  const allowed = size * (1 - MIN_SCALE_SPAN);
  if (start + end <= allowed) return [start, end];
  const scale = allowed / (start + end);
  return [Math.floor(start * scale), Math.floor(end * scale)];
}

/**
 * Rect the scales run in. `labels` is how far the value labels reach outside the
 * frame of the previous pass: pulling the frame in by that much lands them on
 * the plot edge, and the next pass measures the same amount again — which is
 * what makes the iteration settle instead of creeping inwards.
 */
export function labelFrame(plot: LayoutRect, labels: Insets): LayoutRect {
  const [left, right] = reserve(labels.left, labels.right, plot.width);
  const [top, bottom] = reserve(labels.top, labels.bottom, plot.height);
  return {
    x: plot.x + left,
    y: plot.y + top,
    width: Math.max(0, plot.width - left - right),
    height: Math.max(0, plot.height - top - bottom),
  };
}
