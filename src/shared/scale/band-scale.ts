/** Categorical scale with bands (for bar/column). */
export class BandScale<T = unknown> {
  paddingInner = 0.2;
  paddingOuter = 0.1;

  constructor(
    public domain: T[] = [],
    public range: [number, number] = [0, 1],
  ) {}

  /** Full band step (width + inter-band gap) — for heatmap-like series. */
  get stepSize(): number {
    return this.step;
  }

  private get step(): number {
    const count = this.domain.length;
    const [r0, r1] = this.range;
    return (r1 - r0) / Math.max(1, count - this.paddingInner + this.paddingOuter * 2);
  }

  get bandwidth(): number {
    if (this.domain.length === 0) return 0;
    return this.step * (1 - this.paddingInner);
  }

  /** Left edge of the category band. */
  convert(value: T): number {
    const key = bandKey(value);
    const index = this.domain.findIndex((candidate) => bandKey(candidate) === key);
    if (index < 0) return NaN;
    const [r0] = this.range;
    return r0 + this.step * (this.paddingOuter + index);
  }

  /** Band center — for lines/markers/labels over categories. */
  center(value: T): number {
    return this.convert(value) + this.bandwidth / 2;
  }

  ticks(): T[] {
    return this.domain;
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
  if (Array.isArray(value)) return 'a:' + value.map(String).join('\u00a6');
  if (value instanceof Date) return 'd:' + value.getTime();
  return typeof value + ':' + String(value);
}
