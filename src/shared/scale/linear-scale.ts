import { niceExtent, ticks as computeTicks } from '@/shared/util';

/** Linear scale: domain → range. */
export class LinearScale {
  constructor(
    public domain: [number, number] = [0, 1],
    public range: [number, number] = [0, 1],
  ) {}

  convert(value: number): number {
    const [d0, d1] = this.domain;
    const [r0, r1] = this.range;
    if (d1 === d0) return (r0 + r1) / 2;
    return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  }

  invert(position: number): number {
    const [d0, d1] = this.domain;
    const [r0, r1] = this.range;
    if (r1 === r0) return (d0 + d1) / 2;
    return d0 + ((position - r0) / (r1 - r0)) * (d1 - d0);
  }

  /** Rounds the domain to bounds that are multiples of the tick step. */
  nice(count = 5): void {
    const [d0, d1] = this.domain;
    this.domain = niceExtent(d0, d1, count);
  }

  ticks(count = 5): number[] {
    const [d0, d1] = this.domain;
    return computeTicks(d0, d1, count);
  }
}
