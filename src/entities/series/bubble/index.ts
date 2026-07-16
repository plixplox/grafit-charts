import { MarkerSeries, type MarkerSeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import type { CartesianRenderContext, SeriesModule, TooltipContentData } from '@/shared/kernel';
import type { Pixels } from '@/shared/options';
import { extent } from '@/shared/util';

export interface BubbleSeriesOptions extends MarkerSeriesBaseOptions {
  type: 'bubble';
  /** Data key that controls the bubble size. */
  sizeField: string;
  sizeName?: string;
  /** Diameter for the minimum sizeField value. */
  size?: Pixels;
  /** Diameter for the maximum sizeField value. */
  maxSize?: Pixels;
}

export class BubbleSeries extends MarkerSeries<BubbleSeriesOptions> {
  readonly type = 'bubble';
  private sizes: number[] = [];

  protected override prepare(ctx: CartesianRenderContext): void {
    const values = numericValues(ctx.data, this.options.sizeField);
    const [min, max] = extent(values) ?? [0, 1];
    const minSize = this.options.size ?? 8;
    const maxSize = this.options.maxSize ?? 28;
    this.sizes = values.map((value) => {
      if (Number.isNaN(value)) return minSize;
      if (max === min) return (minSize + maxSize) / 2;
      return minSize + ((value - min) / (max - min)) * (maxSize - minSize);
    });
  }

  protected override sizeFor(index: number): Pixels {
    return this.sizes[index] ?? this.options.size ?? 8;
  }

  override tooltipFor(datumIndex: number, mode?: 'single' | 'shared'): TooltipContentData {
    const content = super.tooltipFor(datumIndex, mode);
    if (this.options.tooltip?.renderer) return content;
    const datum = this.lastCtx?.data[datumIndex];
    if (datum) {
      content.rows.push({
        label: this.options.sizeName ?? this.options.sizeField,
        value: String(datum[this.options.sizeField]),
      });
    }
    return content;
  }
}

export const bubbleSeriesModule: SeriesModule<BubbleSeriesOptions> = {
  kind: 'series',
  type: 'bubble',
  requiredOptions: ['xField', 'yField', 'sizeField'],
  chartKind: 'cartesian',
  create: (options, env) => new BubbleSeries(options, env),
};
