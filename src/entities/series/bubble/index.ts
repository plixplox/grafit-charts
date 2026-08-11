import { MarkerSeries, type MarkerSeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import type { CartesianRenderContext, SeriesModule, TooltipContentData } from '@/shared/kernel';
import type { Pixels } from '@/shared/options';
import { extent, partValues } from '@/shared/util';

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

  /** A bubble is a part of a whole: its size is what `minShare` and 'percent' are measured in. */
  protected override shareField(): string {
    return this.options.sizeField;
  }

  /** With avoidOverlap on the big bubbles ask for room first — the specks lose their labels. */
  protected override labelPriority(index: number): number {
    return this.sizes[index] ?? 0;
  }

  override tooltipFor(datumIndex: number, mode?: 'single' | 'shared'): TooltipContentData {
    const content = super.tooltipFor(datumIndex, mode);
    if (this.options.tooltip?.renderer) return content;
    const data = this.lastCtx?.data ?? [];
    const datum = data[datumIndex];
    if (datum) {
      // the size reads as a share of the whole, the way a pie sector does
      const values = partValues(data, this.options.sizeField);
      const total = values.reduce((sum, value) => sum + value, 0);
      const percent = total > 0 ? ` (${Math.round(((values[datumIndex] ?? 0) / total) * 100)}%)` : '';
      content.rows.push({
        label: this.options.sizeName ?? this.options.sizeField,
        value: `${String(datum[this.options.sizeField])}${percent}`,
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
