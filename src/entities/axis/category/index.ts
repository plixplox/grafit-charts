import { BaseAxis, DEFAULT_PADDING_INNER, DEFAULT_PADDING_OUTER, type AxisBaseOptions } from '@/entities/axis/base';
import type { AxisModule, LayoutRect } from '@/shared/kernel';
import type { Pixels } from '@/shared/options';
import { BandScale } from '@/shared/scale';

export interface CategoryAxisOptions extends AxisBaseOptions {
  type: 'category';
  paddingInner?: number;
  paddingOuter?: number;
  /** Gap between categories in px; takes precedence over `paddingInner`. */
  gap?: Pixels;
}

export class CategoryAxis extends BaseAxis<CategoryAxisOptions> {
  readonly type = 'category';
  readonly scale = new BandScale<unknown>();

  setDomain(domain: unknown[], weights?: number[]): void {
    this.scale.domain = domain;
    this.scale.weights = weights;
    this.scale.paddingInner = this.options.paddingInner ?? DEFAULT_PADDING_INNER;
    this.scale.paddingOuter = this.options.paddingOuter ?? DEFAULT_PADDING_OUTER;
  }

  layout(plot: LayoutRect): void {
    this.layoutBandScale(this.scale, plot, this.options.paddingInner ?? DEFAULT_PADDING_INNER, this.options.gap);
  }

  protected tickInfo(): Array<{ value: unknown; coord: number }> {
    return this.scale.domain.map((value) => ({ value, coord: this.scale.center(value) }));
  }

  protected override tickWeight(value: unknown): number {
    return this.scale.weightOf(value);
  }
}

export const categoryAxisModule: AxisModule<CategoryAxisOptions> = {
  kind: 'axis',
  type: 'category',
  create: (options, env) => new CategoryAxis(options, env),
};
