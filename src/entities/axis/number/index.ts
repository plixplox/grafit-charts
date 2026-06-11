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

  setDomain(domain: unknown[]): void {
    const values = domain.filter((value): value is number => typeof value === 'number');
    const [min, max] = extent(values) ?? [0, 1];
    this.scale.domain = [this.options.min ?? min, this.options.max ?? max];
    if (this.options.nice !== false) {
      this.scale.nice(this.tickCount());
      const [d0, d1] = this.scale.domain;
      this.scale.domain = [this.options.min ?? d0, this.options.max ?? d1];
    }
  }

  layout(plot: LayoutRect): void {
    // a vertical number axis grows upward
    this.scale.range = this.isHorizontal ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
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
