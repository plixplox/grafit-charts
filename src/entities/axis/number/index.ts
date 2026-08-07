import { BaseAxis, type AxisBaseOptions } from '@/entities/axis/base';
import type { AxisModule, LayoutRect } from '@/shared/kernel';
import { LinearScale } from '@/shared/scale';
import { extent } from '@/shared/util';

export interface NumberAxisOptions extends AxisBaseOptions {
  type: 'number';
  min?: number;
  max?: number;
  /** Round the domain to "nice" boundaries (true by default). */
  nice?: boolean;
}

const TICK_PIXEL_INTERVAL = 70;

export class NumberAxis extends BaseAxis<NumberAxisOptions> {
  readonly type = 'number';
  readonly scale = new LinearScale();

  /** The data extent as it came in; `nice` bounds are derived from it, never stacked on top. */
  private rawDomain: [number, number] = [0, 1];

  setDomain(domain: unknown[]): void {
    const values = domain.filter((value): value is number => typeof value === 'number');
    this.rawDomain = extent(values) ?? [0, 1];
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
    if (this.options.nice === false) return;
    this.scale.nice(this.tickCount());
    const [d0, d1] = this.scale.domain;
    this.scale.domain = [this.options.min ?? d0, this.options.max ?? d1];
  }

  protected tickInfo(): Array<{ value: unknown; coord: number }> {
    return this.scale.ticks(this.tickCount()).map((value) => ({ value, coord: this.scale.convert(value) }));
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
