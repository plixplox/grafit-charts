/** Categorical scale with bands (for bar/column). */
export class BandScale<T = unknown> {
  paddingInner = 0.2;
  paddingOuter = 0.1;

  /**
   * How much of a band each category takes, 0..1, category by category. Every
   * category takes a whole one unless something says otherwise — an update
   * transition does, for the categories arriving and leaving: a band that
   * narrows to nothing lets its neighbours spread into the room it gives up,
   * instead of the whole axis snapping wider the moment it goes.
   */
  weights: number[] | undefined;

  constructor(
    public domain: T[] = [],
    public range: [number, number] = [0, 1],
  ) {}

  /** Full band step of a whole band (width + inter-band gap) — for heatmap-like series. */
  get stepSize(): number {
    return this.unit;
  }

  /**
   * Length one whole band takes, gap included. With weights it is the length a
   * band of weight 1 would take, and each band takes its own share of it.
   */
  private get unit(): number {
    const [r0, r1] = this.range;
    return (r1 - r0) / Math.max(1, this.totalWeight - this.paddingInner + this.paddingOuter * 2);
  }

  private get totalWeight(): number {
    if (!this.weights) return this.domain.length;
    let total = 0;
    for (let index = 0; index < this.domain.length; index++) total += this.weightAt(index);
    return total;
  }

  private weightAt(index: number): number {
    const weight = this.weights?.[index];
    return weight === undefined || !Number.isFinite(weight) ? 1 : Math.min(1, Math.max(0, weight));
  }

  get bandwidth(): number {
    if (this.domain.length === 0) return 0;
    return this.unit * (1 - this.paddingInner);
  }

  /** Width of one category's band — its own share, where the shares differ. */
  bandwidthOf(value: T): number {
    const index = this.indexOf(value);
    if (index < 0) return this.bandwidth;
    return this.unit * this.weightAt(index) * (1 - this.paddingInner);
  }

  /** Share of a band a category holds, 0..1 — a whole one unless weights say otherwise. */
  weightOf(value: T): number {
    const index = this.indexOf(value);
    return index < 0 ? 1 : this.weightAt(index);
  }

  /** Left edge of the category band. */
  convert(value: T): number {
    const index = this.indexOf(value);
    if (index < 0) return NaN;
    const [r0] = this.range;
    let offset = 0;
    for (let before = 0; before < index; before++) offset += this.weightAt(before);
    return r0 + this.unit * (this.paddingOuter + offset);
  }

  /** Band center — for lines/markers/labels over categories. */
  center(value: T): number {
    return this.convert(value) + this.bandwidthOf(value) / 2;
  }

  ticks(): T[] {
    return this.domain;
  }

  private indexOf(value: T): number {
    const key = bandKey(value);
    return this.domain.findIndex((candidate) => bandKey(candidate) === key);
  }
}

/** Default gap between group slots inside a band — fraction of the slot step. */
export const DEFAULT_GROUP_GAP = 0.1;

/**
 * Splits a band into slots for grouped series (bar, range-bar, box-plot,
 * radial-column): adjacent slots are separated by `gap` (fraction of the slot
 * step), the band edges stay flush. A single slot takes the whole band.
 */
export function groupSlot(
  bandwidth: number,
  group: { index: number; count: number } | undefined,
  gap: number = DEFAULT_GROUP_GAP,
): { start: number; size: number } {
  const count = Math.max(1, group?.count ?? 1);
  if (count === 1) return { start: 0, size: bandwidth };
  const clamped = Math.min(Math.max(gap, 0), 0.9);
  const step = bandwidth / (count - clamped);
  return { start: step * (group?.index ?? 0), size: step * (1 - clamped) };
}

/** Category comparison key: arrays (grouped-category) and dates are compared by value. */
function bandKey(value: unknown): string {
  // element by element, keeping each one's own type: [null, 'x'] is not ['null', 'x']
  if (Array.isArray(value)) return 'a:' + value.map(bandKey).join('\u00a6');
  if (value instanceof Date) return 'd:' + value.getTime();
  return typeof value + ':' + String(value);
}
