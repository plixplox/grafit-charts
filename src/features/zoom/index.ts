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

/** Slices a categorical domain by the window. */
export function sliceDomain(domain: unknown[], window: ZoomWindow): unknown[] {
  if (!isZoomed(window) || domain.length === 0) return domain;
  const from = Math.floor(domain.length * window[0]);
  const to = Math.max(from + 1, Math.ceil(domain.length * window[1]));
  return domain.slice(from, to);
}

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
