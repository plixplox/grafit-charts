import { LinearScale } from './linear-scale';

/** Compensates Math.log FP error: log10(1000) = 2.9999…96, otherwise floor/ceil lose the exact power. */
const LOG_EPSILON = 1e-9;

/** Logarithmic scale (domain strictly of one sign, positive by default). */
export class LogScale extends LinearScale {
  base = 10;

  override convert(value: number): number {
    const [d0, d1] = this.domain;
    const [r0, r1] = this.range;
    const l0 = Math.log(Math.abs(d0));
    const l1 = Math.log(Math.abs(d1));
    if (l1 === l0 || value <= 0) return r0;
    return r0 + ((Math.log(value) - l0) / (l1 - l0)) * (r1 - r0);
  }

  override invert(position: number): number {
    const [d0, d1] = this.domain;
    const [r0, r1] = this.range;
    const l0 = Math.log(Math.abs(d0));
    const l1 = Math.log(Math.abs(d1));
    if (r1 === r0) return d0;
    return Math.exp(l0 + ((position - r0) / (r1 - r0)) * (l1 - l0));
  }

  /** Extends the domain to the nearest powers of base. */
  override nice(): void {
    const [d0, d1] = this.domain;
    if (d0 <= 0 || d1 <= 0) {
      this.domain = [Math.max(d0, 1e-9), Math.max(d1, 1)];
      return;
    }
    const logBase = Math.log(this.base);
    this.domain = [
      this.base ** Math.floor(Math.log(d0) / logBase + LOG_EPSILON),
      this.base ** Math.ceil(Math.log(d1) / logBase - LOG_EPSILON),
    ];
  }

  /** Ticks at powers of base; linear when the domain is narrow. */
  override ticks(count = 5): number[] {
    const [d0, d1] = this.domain;
    if (d0 <= 0 || d1 <= 0) return [];
    const logBase = Math.log(this.base);
    const p0 = Math.ceil(Math.log(d0) / logBase - LOG_EPSILON);
    const p1 = Math.floor(Math.log(d1) / logBase + LOG_EPSILON);
    if (p1 - p0 < 1) return super.ticks(count);
    const result: number[] = [];
    const stride = Math.max(1, Math.ceil((p1 - p0 + 1) / count));
    for (let p = p0; p <= p1; p += stride) {
      result.push(this.base ** p);
    }
    return result;
  }
}
