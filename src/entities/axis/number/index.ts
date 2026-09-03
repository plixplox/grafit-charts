import { BaseAxis, type AxisBaseOptions } from '@/entities/axis/base';
import type { AxisModule, LayoutRect } from '@/shared/kernel';
import { LinearScale } from '@/shared/scale';
import { extent, ticks } from '@/shared/util';

export interface NumberAxisOptions extends AxisBaseOptions {
  type: 'number';
  min?: number;
  max?: number;
  /** Round the domain to "nice" boundaries (true by default). */
  nice?: boolean;
  /**
   * Width of a bar in axis units — the numeric counterpart of the same option
   * on the time axis. Without it the step is measured off the data.
   */
  bandSpan?: number;
}

const TICK_PIXEL_INTERVAL = 70;
/** Floating-point slack when asking whether a tick of the settled domain is in frame yet. */
const TICK_EPSILON = 1e-9;

export class NumberAxis extends BaseAxis<NumberAxisOptions> {
  readonly type = 'number';
  readonly scale = new LinearScale();

  /** The data extent as it came in; `nice` bounds are derived from it, never stacked on top. */
  private rawDomain: [number, number] = [0, 1];

  get bandSpan(): number | undefined {
    return this.options.bandSpan;
  }

  /** Where the bounds are walking from while an update runs, and how far along. */
  private transition: { from: [number, number]; t: number } | undefined;
  /** The bounds the ticks are chosen from — the settled ones, while the drawn ones move. */
  private tickDomain: [number, number] | undefined;
  /** How present each tick of a frame is: whole where both scales carry it, fading either way. */
  private tickWeights: Map<number, number> | undefined;
  /** Which of a frame's ticks belong to the scale being arrived at: they win a tie over a label. */
  private settledTicks: Set<number> | undefined;

  setDomain(domain: unknown[]): void {
    const values = domain.filter((value): value is number => typeof value === 'number');
    this.rawDomain = extent(values) ?? [0, 1];
    this.applyDomain();
  }

  setTransitionDomain(from: [number, number], t: number): void {
    this.transition = t >= 1 ? undefined : { from, t };
    this.applyDomain();
  }

  layout(plot: LayoutRect): void {
    // a vertical number axis grows upward
    this.scale.range = this.isHorizontal ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
    // the nice bounds follow the tick count, and only the range knows it: recompute
    // them here, or the grid would depend on whether a layout has run before
    this.applyDomain();
  }

  private applyDomain(): void {
    const [min, max] = this.rawDomain;
    this.scale.domain = [this.options.min ?? min, this.options.max ?? max];
    if (this.options.nice !== false) {
      this.scale.nice(this.tickCount());
      const [d0, d1] = this.scale.domain;
      this.scale.domain = [this.options.min ?? d0, this.options.max ?? d1];
    }
    this.applyTransition();
  }

  /**
   * Partway through an update the axis converts on bounds on their way to the
   * settled ones, and carries both sets of ticks: the ones it had fade out as
   * the ones it is going to fade in. The grid slides where the two agree and
   * changes hands where they do not, and nothing on the chart jumps for it.
   */
  private applyTransition(): void {
    const transition = this.transition;
    if (!transition) {
      this.tickDomain = undefined;
      this.tickWeights = undefined;
      this.settledTicks = undefined;
      return;
    }
    const settled = this.scale.domain;
    this.tickDomain = [settled[0], settled[1]];
    this.scale.domain = [
      transition.from[0] + (settled[0] - transition.from[0]) * transition.t,
      transition.from[1] + (settled[1] - transition.from[1]) * transition.t,
    ];
    const count = this.tickCount();
    const weights = new Map<number, number>();
    // arriving with the settled scale, and leaving with the one being left —
    // each set thinned to distinct labels on its own, before the two are put
    // together, so a tick the settled scale will not print does not flash by
    const arriving = this.distinctTicks(ticks(settled[0], settled[1], count));
    for (const value of arriving) weights.set(value, transition.t);
    for (const value of this.distinctTicks(ticks(transition.from[0], transition.from[1], count))) {
      weights.set(value, weights.has(value) ? 1 : 1 - transition.t);
    }
    this.tickWeights = weights;
    this.settledTicks = new Set(arriving);
  }

  /** The ticks of one scale whose labels differ, as the axis would print them. */
  private distinctTicks(values: number[]): number[] {
    return this.keepDistinct(values, (value, index) => this.formatTick(value, index));
  }

  /**
   * The two scales of a frame put together, cleared of labels that read alike.
   * Each set is distinct on its own, but the steps they walk between need not
   * agree, and a frame printing both would show back the repeat the axis just
   * stepped out of. Where two ticks read the same the one the axis is settling
   * on stays, so the walk ends on the scale it was headed for.
   */
  private withoutRepeats(values: number[]): number[] {
    const settled = this.settledTicks;
    const kept: number[] = [];
    let last: string | undefined;
    for (const value of values) {
      const label = this.formatTick(value, kept.length);
      if (label !== last) {
        kept.push(value);
        last = label;
        continue;
      }
      const previous = kept[kept.length - 1];
      if (previous !== undefined && settled?.has(value) && !settled.has(previous)) kept[kept.length - 1] = value;
    }
    return kept;
  }

  /**
   * A number line has one label per amount, so two ticks reading the same is a
   * format too coarse for the step. Partway through an update the frame carries
   * the ticks of both scales, each already thinned on its own; the union of two
   * steps is not evenly spaced, and thinning it by position again would drop
   * ticks the walk needs.
   */
  protected override get labelsMustDiffer(): boolean {
    return this.tickWeights === undefined;
  }

  protected tickInfo(): Array<{ value: unknown; coord: number }> {
    const [low, high] = this.scale.domain[0] <= this.scale.domain[1] ? this.scale.domain : [this.scale.domain[1], this.scale.domain[0]];
    const values = this.tickWeights
      ? this.withoutRepeats([...this.tickWeights.keys()].sort((a, b) => a - b))
      : this.scale.ticks(this.tickCount());
    return (
      values
        // a tick of either scale may sit outside the bounds of the frame; it
        // arrives once the walk brings it in
        .filter((value) => value >= low - TICK_EPSILON && value <= high + TICK_EPSILON)
        .map((value) => ({ value, coord: this.scale.convert(value) }))
    );
  }

  protected override tickWeight(value: unknown): number {
    if (!this.tickWeights || typeof value !== 'number') return 1;
    return this.tickWeights.get(value) ?? 1;
  }

  /**
   * The scale the axis is settling on, at the coordinates it will settle in.
   * The topmost tick of that scale sits on its upper bound, so a frame partway
   * through the walk has not reached it — and a layout measured off the frame
   * would hand the plot the room of that label and take it back the moment the
   * walk ends, dropping every bar on the chart a few pixels at the very end.
   */
  protected override measurementTicks(): Array<{ value: unknown; coord: number; index: number }> {
    const settled = this.tickDomain;
    if (!settled) return this.displayTicks();
    const scale = new LinearScale([settled[0], settled[1]], this.scale.range);
    return this.distinctTicks(ticks(settled[0], settled[1], this.tickCount())).map((value, index) => ({
      value,
      coord: scale.convert(value),
      index,
    }));
  }

  private tickCount(): number {
    const [r0, r1] = this.scale.range;
    const length = Math.abs(r1 - r0);
    return length > 0 ? Math.max(2, Math.floor(length / TICK_PIXEL_INTERVAL)) : 5;
  }
}

export const numberAxisModule: AxisModule<NumberAxisOptions> = {
  kind: 'axis',
  type: 'number',
  create: (options, env) => new NumberAxis(options, env),
};
