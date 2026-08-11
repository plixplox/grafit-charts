import { BaseAxis, type AxisBaseOptions } from '@/entities/axis/base';
import type { AxisModule, LayoutRect } from '@/shared/kernel';
import { TimeScale, toTimestamp } from '@/shared/scale';
import { formatValue } from '@/shared/util';

export interface TimeAxisOptions extends AxisBaseOptions {
  type: 'time';
  min?: Date | number;
  max?: Date | number;
  /**
   * Width of a bar in axis units — milliseconds, so a bar keeps covering its
   * own period through a zoom. Without it the step is measured off the data:
   * the smallest distance between neighbouring points.
   */
  bandSpan?: number;
}

const TICK_PIXEL_INTERVAL = 90;

export class TimeAxis extends BaseAxis<TimeAxisOptions> {
  readonly type = 'time';
  readonly scale = new TimeScale();

  get bandSpan(): number | undefined {
    return this.options.bandSpan;
  }

  setDomain(domain: unknown[]): void {
    const values = domain.map(toTimestamp).filter((value) => !Number.isNaN(value));
    // every value refused to be a date: the domain that follows is a fiction,
    // and the chart drawn over it is empty for a reason nothing else states
    this.domainError =
      domain.length > 0 && values.length === 0
        ? `grafit: a time axis got ${domain.length} value(s) and not one of them parses as a date ` +
          `(first: ${JSON.stringify(domain[0])}). Use Date, a timestamp or an ISO string — or a category axis.`
        : undefined;
    const min = this.options.min !== undefined ? toTimestamp(this.options.min) : Math.min(...values);
    const max = this.options.max !== undefined ? toTimestamp(this.options.max) : Math.max(...values);
    this.scale.domain = values.length > 0 || this.options.min !== undefined ? [min, max] : [0, 1];
  }

  layout(plot: LayoutRect): void {
    this.scale.range = this.isHorizontal ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
  }

  protected override formatTick(value: unknown, index: number): string {
    const formatter = this.options.label?.formatter;
    if (formatter) return formatter({ value, index });
    const format = this.options.label?.format;
    if (format) return formatValue(format, value);
    return this.scale.formatTick(Number(value));
  }

  protected tickInfo(): Array<{ value: unknown; coord: number }> {
    const [r0, r1] = this.scale.range;
    const count = Math.max(2, Math.floor(Math.abs(r1 - r0) / TICK_PIXEL_INTERVAL));
    return this.scale.ticks(count).map((value) => ({ value, coord: this.scale.convert(value) }));
  }
}

export const timeAxisModule: AxisModule<TimeAxisOptions> = {
  kind: 'axis',
  type: 'time',
  create: (options, env) => new TimeAxis(options, env),
};
