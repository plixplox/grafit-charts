import { BaseAxis, type AxisBaseOptions } from '@/entities/axis/base';
import type { AxisModule, LayoutRect } from '@/shared/kernel';
import { LogScale } from '@/shared/scale';
import { extent } from '@/shared/util';

export interface LogAxisOptions extends AxisBaseOptions {
  type: 'log';
  base?: number;
  min?: number;
  max?: number;
}

export class LogAxis extends BaseAxis<LogAxisOptions> {
  readonly type = 'log';
  readonly scale = new LogScale();

  setDomain(domain: unknown[]): void {
    this.scale.base = this.options.base ?? 10;
    const values = domain.filter((value): value is number => typeof value === 'number' && value > 0);
    const [min, max] = extent(values) ?? [1, 10];
    this.scale.domain = [this.options.min ?? min, this.options.max ?? max];
    this.scale.nice();
    const [d0, d1] = this.scale.domain;
    this.scale.domain = [this.options.min ?? d0, this.options.max ?? d1];
  }

  layout(plot: LayoutRect): void {
    this.scale.range = this.isHorizontal ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
  }

  protected tickInfo(): Array<{ value: unknown; coord: number }> {
    return this.scale.ticks().map((value) => ({ value, coord: this.scale.convert(value) }));
  }

  /** Decades stand for different amounts; two of them reading the same is a format too coarse. */
  protected override get labelsMustDiffer(): boolean {
    return true;
  }
}

export const logAxisModule: AxisModule<LogAxisOptions> = {
  kind: 'axis',
  type: 'log',
  create: (options, env) => new LogAxis(options, env),
};
