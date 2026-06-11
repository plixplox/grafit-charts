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

/** Category comparison key: arrays (grouped-category) and dates are compared by value. */
function bandKey(value: unknown): string {
  if (Array.isArray(value)) return 'a:' + value.map(String).join('\u00a6');
  if (value instanceof Date) return 'd:' + value.getTime();
  return typeof value + ':' + String(value);
}
