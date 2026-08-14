/**
 * Where a mark's band sits along an axis — the one thing a bar asks of the
 * scale beneath it, and the only thing that used to tie bars to a category
 * axis.
 *
 * A band scale answers from bands it already has. A continuous one (time,
 * number) has no bands, so the answer is built from the step of the data: the
 * band is `span` wide in axis units, centred on the value. Axis units rather
 * than pixels is what keeps a bar over its own period through a zoom — the
 * edges are converted separately, so a scale that is not linear (log) still
 * gets bands that end where its neighbours begin.
 */
import { BandScale } from './band-scale';
import { LinearScale } from './linear-scale';
import { TimeScale, toTimestamp } from './time-scale';

export interface Band {
  /** Left (top on a vertical axis) edge of the band, in pixels. */
  start: number;
  /** Width of the band itself — what a bar fills. */
  size: number;
  /** Step to the next band, gap included — what a heatmap cell fills. */
  step: number;
}

export interface BandLayout {
  /** The band of a value, or undefined when the value is not on the scale. */
  bandOf(value: unknown): Band | undefined;
}

/** One point says nothing about the step, so its band takes this much of the plot. */
const LONE_BAND_FRACTION = 0.1;

/** Value as the scale beneath it reads it: a time scale parses dates, the rest take numbers. */
function scaleValue(scale: LinearScale, value: unknown): number {
  return scale instanceof TimeScale ? toTimestamp(value) : Number(value);
}

/**
 * Smallest distance between neighbouring values — the widest band that never
 * runs into the next one. The minimum rather than the average: with months of
 * unequal length, or a day of data missing, an average step overlaps.
 */
export function closestSpan(values: readonly unknown[], parse: (value: unknown) => number = toTimestamp): number | undefined {
  const numbers = values.map(parse).filter((value) => Number.isFinite(value));
  if (numbers.length < 2) return undefined;
  const sorted = [...numbers].sort((a, b) => a - b);
  let span = Infinity;
  for (let index = 1; index < sorted.length; index++) {
    const step = sorted[index]! - sorted[index - 1]!;
    if (step > 0 && step < span) span = step;
  }
  return Number.isFinite(span) ? span : undefined;
}

/**
 * Band layout over any scale. `span` is the step of the data in axis units
 * (milliseconds on a time axis) and is only consulted on a continuous scale;
 * without it — and there is nothing to derive it from on a single point — the
 * band falls back to a share of `extent`, the plot's length along the axis.
 */
export function bandLayout(scale: BandScale<unknown> | LinearScale, span: number | undefined, extent: number): BandLayout {
  if (scale instanceof BandScale) return new CategoryBands(scale);
  return new ContinuousBands(scale, span, extent);
}

class CategoryBands implements BandLayout {
  constructor(private readonly scale: BandScale<unknown>) {}

  bandOf(value: unknown): Band | undefined {
    const start = this.scale.convert(value);
    if (Number.isNaN(start)) return undefined;
    // a category on its way in or out has a band of its own width
    return { start, size: this.scale.bandwidthOf(value), step: this.scale.stepSize };
  }
}

class ContinuousBands implements BandLayout {
  constructor(
    private readonly scale: LinearScale,
    private readonly span: number | undefined,
    private readonly extent: number,
  ) {}

  bandOf(value: unknown): Band | undefined {
    const numeric = scaleValue(this.scale, value);
    if (!Number.isFinite(numeric)) return undefined;
    const center = this.scale.convert(numeric);
    if (!Number.isFinite(center)) return undefined;
    // both edges converted, never the centre shifted by half a width: on a
    // scale that is not linear the band is lopsided around its own value
    const edges = this.edgesAround(numeric);
    if (!edges) {
      const size = Math.abs(this.extent) * LONE_BAND_FRACTION;
      return { start: center - size / 2, size, step: size };
    }
    const size = Math.abs(edges[1] - edges[0]);
    return { start: Math.min(edges[0], edges[1]), size, step: size };
  }

  /** Pixel edges of a `span` around a value, or undefined without a span. */
  private edgesAround(value: number): [number, number] | undefined {
    if (this.span === undefined || !(this.span > 0)) return undefined;
    return [this.scale.convert(value - this.span / 2), this.scale.convert(value + this.span / 2)];
  }
}
