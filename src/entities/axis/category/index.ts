import { BaseAxis, type AxisBaseOptions } from '@/entities/axis/base';
import type { AxisModule, LayoutRect } from '@/shared/kernel';
import { BandScale } from '@/shared/scale';

export interface CategoryAxisOptions extends AxisBaseOptions {
  type: 'category';
  paddingInner?: number;
  paddingOuter?: number;
}

export class CategoryAxis extends BaseAxis<CategoryAxisOptions> {
  readonly type = 'category';
  readonly scale = new BandScale<unknown>();

  setDomain(domain: unknown[]): void {
    this.scale.domain = domain;
    this.scale.paddingInner = this.options.paddingInner ?? 0.2;
    this.scale.paddingOuter = this.options.paddingOuter ?? 0.1;
  }

  layout(plot: LayoutRect): void {
    // categories read left to right and top to bottom
    this.scale.range = this.isHorizontal ? [plot.x, plot.x + plot.width] : [plot.y, plot.y + plot.height];
  }

  protected tickInfo(): Array<{ value: unknown; coord: number }> {
    return this.scale.domain.map((value) => ({ value, coord: this.scale.center(value) }));
  }
}

export const categoryAxisModule: AxisModule<CategoryAxisOptions> = {
  kind: 'axis',
  type: 'category',
  create: (options, env) => new CategoryAxis(options, env),
};
