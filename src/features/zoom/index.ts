import type { ZoomWindow } from '@/shared/kernel';
import type { Switchable } from '@/shared/options';

export type { ZoomWindow };

export interface ZoomOptions extends Switchable {
  /** Which axes are zoomable ('x' by default). */
  axes?: 'x' | 'y' | 'xy';
  /** Mouse wheel zoom (true by default). */
  wheelZoom?: boolean;
  /** Pan by dragging (true by default). */
  dragPan?: boolean;
  /** Modifier key for panning; without it, dragging selects an area (box-zoom). */
  panKey?: 'alt' | 'ctrl' | 'shift' | 'meta';
  /** Drag to select an area → zoom (false by default). */
  dragSelect?: boolean;
  /** Reset on double click (true by default). */
  doubleClickReset?: boolean;
  /** Zoom step per wheel tick (0.1 by default). */
  wheelStep?: number;
  /** Minimum window width (fraction of the domain, 0.05 by default). */
  minRatio?: number;
  /**
   * Initial window sized to this many items along the category axis.
   * Applies even without `enabled`, and yields to an explicit `navigator.min`/`max`.
   * `minRatio` does not clamp it: an explicit count outranks the interaction floor.
   */
  visibleCount?: number;
  /** Which end of the domain `visibleCount` starts from ('start' by default). */
  visibleAnchor?: 'start' | 'end';
}

export const FULL_WINDOW: ZoomWindow = [0, 1];

export function isZoomed(window: ZoomWindow): boolean {
  return window[0] > 0 || window[1] < 1;
}

/** Zoom around a point: pivot is the cursor position as a fraction of the window (0..1). */
export function zoomAround(window: ZoomWindow, pivot: number, factor: number, minRatio: number): ZoomWindow {
  const [start, end] = window;
  const span = end - start;
  const newSpan = Math.min(1, Math.max(minRatio, span * factor));
  const anchor = start + span * pivot;
  let newStart = anchor - newSpan * pivot;
  let newEnd = newStart + newSpan;
  if (newStart < 0) {
    newStart = 0;
    newEnd = newSpan;
  }
  if (newEnd > 1) {
    newEnd = 1;
    newStart = 1 - newSpan;
  }
  return [newStart, newEnd];
}

/** Shifts the window by a fraction of its width. */
export function panWindow(window: ZoomWindow, deltaRatio: number): ZoomWindow {
  const [start, end] = window;
  const span = end - start;
  let newStart = start + deltaRatio * span;
  newStart = Math.max(0, Math.min(newStart, 1 - span));
  return [newStart, newStart + span];
}

/**
 * Window showing `count` of `total` items, anchored to one end of the domain.
 * The full window comes back when the count covers everything or makes no sense.
 */
export function windowForCount(count: number, total: number, anchor: 'start' | 'end' = 'start'): ZoomWindow {
  if (!Number.isFinite(count) || count < 1 || total <= 0 || count >= total) return FULL_WINDOW;
  const span = Math.floor(count) / total;
  return anchor === 'start' ? [0, span] : [1 - span, 1];
}

/** Slices a categorical domain by the window. */
export function sliceDomain(domain: unknown[], window: ZoomWindow): unknown[] {
  if (!isZoomed(window) || domain.length === 0) return domain;
  // count/total windows land on an index exactly, and binary fractions miss it by
  // an ulp either way — nudge both ends so a window of N never slices N ± 1
  const from = Math.floor(domain.length * window[0] + EDGE_EPSILON);
  const to = Math.max(from + 1, Math.ceil(domain.length * window[1] - EDGE_EPSILON));
  return domain.slice(from, to);
}

const EDGE_EPSILON = 1e-9;

/** Window of a numeric domain. */
export function windowExtent(values: number[], window: ZoomWindow): number[] {
  if (!isZoomed(window) || values.length === 0) return values;
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (min > max) return values;
  const span = max - min;
  return [min + span * window[0], min + span * window[1]];
}
