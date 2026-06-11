import type { Switchable } from '@/shared/options';

export interface AnimationOptions extends Switchable {
  /** Entrance animation duration, ms (600 by default). */
  duration?: number;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** rAF animator of a 0→1 factor (series entrance animation). */
export class Animator {
  private raf: number | undefined;

  /** Current animation factor (1 = finished). */
  t = 1;

  play(duration: number, onFrame: (t: number) => void): void {
    this.stop();
    if (typeof requestAnimationFrame !== 'function' || duration <= 0) {
      this.t = 1;
      onFrame(1);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / duration);
      this.t = easeOutCubic(raw);
      onFrame(this.t);
      if (raw < 1) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.raf = undefined;
      }
    };
    this.t = 0;
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.raf !== undefined) {
      cancelAnimationFrame(this.raf);
      this.raf = undefined;
    }
    this.t = 1;
  }
}
