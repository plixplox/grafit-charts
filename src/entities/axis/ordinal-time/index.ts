import { BaseAxis, type AxisBaseOptions } from '@/entities/axis/base';
import type { AxisModule, LayoutRect } from '@/shared/kernel';
import { BandScale, toTimestamp } from '@/shared/scale';
import { formatValue } from '@/shared/util';

export interface OrdinalTimeAxisOptions extends AxisBaseOptions {
  type: 'ordinal-time';
  paddingInner?: number;
  paddingOuter?: number;
}

/**
 * Categorical time scale: each point is a band, so non-trading days
 * leave no gaps (unlike the continuous time axis).
 */
export class OrdinalTimeAxis extends BaseAxis<OrdinalTimeAxisOptions> {
  readonly type = 'ordinal-time';
  readonly scale = new BandScale<unknown>();

  setDomain(domain: unknown[]): void {
    this.scale.domain = domain;
    this.scale.paddingInner = this.options.paddingInner ?? 0.25;
    this.scale.paddingOuter = this.options.paddingOuter ?? 0.1;
  }

  layout(plot: LayoutRect): void {
    this.layoutBandScale(this.scale, plot, this.options.paddingInner);
  }

  protected override formatTick(value: unknown, index: number): string {
    const formatter = this.options.label?.formatter;
    if (formatter) return formatter({ value, index });
    const format = this.options.label?.format;
    if (format) return formatValue(format, value);
    const ms = toTimestamp(value);
    if (Number.isNaN(ms)) return String(value);
    const span = this.domainSpanMs();
    const date = new Date(ms);
    if (span > 365 * 24 * 3600 * 1000) {
      return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  private domainSpanMs(): number {
    const domain = this.scale.domain;
    if (domain.length < 2) return 0;
    return Math.abs(toTimestamp(domain[domain.length - 1]) - toTimestamp(domain[0]));
  }

  protected tickInfo(): Array<{ value: unknown; coord: number }> {
    return this.scale.domain.map((value) => ({ value, coord: this.scale.center(value) }));
  }
}

export const ordinalTimeAxisModule: AxisModule<OrdinalTimeAxisOptions> = {
  kind: 'axis',
  type: 'ordinal-time',
  create: (options, env) => new OrdinalTimeAxis(options, env),
};
