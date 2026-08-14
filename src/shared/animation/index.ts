import type { Datum, Switchable } from '@/shared/options';

export * from './data-transition';

export interface AnimationOptions extends Switchable {
  /** Entrance animation duration, ms (600 by default). */
  duration?: number;
  /**
   * The update transition on its own, and it wins wherever it was set: a chart
   * asked to appear at once (`enabled: false`) and to move afterwards says so
   * with `updateEnabled: true`. Without it the update follows `enabled`.
   */
  updateEnabled?: boolean;
  /** Update transition duration, ms; falls back to `duration`, and to 450 without it. */
  updateDuration?: number;
  /**
   * What makes a row the same row across an update: the name of a field, or a
   * function over the row. Without it rows are matched by position, so a change
   * in their number is drawn at once instead of flowing — with it, the rows that
   * stayed flow to their new values while the ones that came and went grow and
   * sink at the ends.
   */
  key?: string | ((datum: Datum, index: number) => unknown);
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** rAF animator of a 0→1 factor (series entrance animation). */
export class Animator {
  private raf: number | undefined;
  /** Resolves the promise of the run in flight — on its last frame or on stop(). */
  private settle: (() => void) | undefined;

  /** Current animation factor (1 = finished). */
  t = 1;

  /** Resolves when the run ends, whether it played out or was stopped. */
  play(duration: number, onFrame: (t: number) => void): Promise<void> {
    this.stop();
    if (typeof requestAnimationFrame !== 'function' || duration <= 0) {
      this.t = 1;
      onFrame(1);
      return Promise.resolve();
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
        this.finish();
      }
    };
    this.t = 0;
    this.raf = requestAnimationFrame(tick);
    return new Promise<void>((resolve) => {
      this.settle = resolve;
    });
  }

  stop(): void {
    if (this.raf !== undefined) {
      cancelAnimationFrame(this.raf);
      this.raf = undefined;
    }
    this.t = 1;
    this.finish();
  }

  private finish(): void {
    const settle = this.settle;
    this.settle = undefined;
    settle?.();
  }
}
