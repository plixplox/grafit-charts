import { CartesianSeries, placeRectLabel, type RectLabelPlacement, type SeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianRenderContext, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, FontOptions, Switchable } from '@/shared/options';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';
import { extent, contrastTextColor } from '@/shared/util';

export interface RangeBarSeriesOptions extends Omit<SeriesBaseOptions, 'yField' | 'name'> {
  type: 'range-bar';
  yLowField: string;
  yHighField: string;
  name?: string;
  /** Value labels: same placements as bar (top, inner-top, center, …). */
  label?: Switchable &
    FontOptions & {
      placement?: RectLabelPlacement;
      formatter?: (params: { low: number; high: number; datum: Datum }) => string;
    };
  fill?: ColorValue;
  fillOpacity?: Fraction;
  cornerRadius?: Pixels;
}

interface BarRect {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class RangeBarSeries extends CartesianSeries<RangeBarSeriesOptions & { yField: string }> {
  readonly type = 'range-bar';
  private rects: BarRect[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  protected override get seriesName(): string {
    return this.options.name ?? `${this.options.yLowField}–${this.options.yHighField}`;
  }

  override occupiesBandSlot(): boolean {
    return true;
  }

  override yDomain(data: Datum[]): [number, number] | undefined {
    return extent([...numericValues(data, this.options.yLowField), ...numericValues(data, this.options.yHighField)]);
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.rects = [];
    if (!this.visible) return;
    const bandScale = ctx.swapped ? ctx.yScale : ctx.xScale;
    const valueScale = ctx.swapped ? ctx.xScale : ctx.yScale;
    if (!(bandScale instanceof BandScale) || !(valueScale instanceof LinearScale)) {
      throw new Error('grafit: range-bar requires a category axis and a numeric axis');
    }
    const lows = numericValues(ctx.data, this.options.yLowField);
    const highs = numericValues(ctx.data, this.options.yHighField);
    const groupIndex = ctx.group?.index ?? 0;
    const groupCount = ctx.group?.count ?? 1;
    const slot = bandScale.bandwidth / groupCount;
    const t = ctx.animationT ?? 1;
    const group = new Group();

    ctx.data.forEach((datum, index) => {
      const low = lows[index];
      const high = highs[index];
      if (low === undefined || high === undefined || Number.isNaN(low) || Number.isNaN(high)) return;
      const bandStart = bandScale.convert(datum[this.options.xField]);
      if (Number.isNaN(bandStart)) return;
      const mid = (low + high) / 2;
      const p0 = valueScale.convert(mid + (low - mid) * t);
      const p1 = valueScale.convert(mid + (high - mid) * t);
      const along = bandStart + slot * groupIndex;
      const rect: BarRect = ctx.swapped
        ? { index, x: Math.min(p0, p1), y: along, width: Math.abs(p1 - p0), height: slot }
        : { index, x: along, y: Math.min(p0, p1), width: slot, height: Math.abs(p1 - p0) };
      this.rects.push(rect);

      const node = new Rect();
      node.x = rect.x;
      node.y = rect.y;
      node.width = rect.width;
      node.height = rect.height;
      node.fill = this.mainColor();
      node.opacity = this.options.fillOpacity ?? 0.9;
      node.cornerRadius = this.options.cornerRadius ?? 3;
      group.append(node);

      if (this.options.label?.enabled === true) {
        const labelOptions = this.options.label;
        const placed = placeRectLabel(labelOptions.placement ?? 'top', rect);
        const text = new Text();
        const labelValue = `${low} – ${high}`;
        text.text = labelOptions.formatter ? labelOptions.formatter({ low, high, datum }) : String(labelValue);
        text.x = placed.x;
        text.y = placed.y;
        text.textAlign = placed.align;
        text.textBaseline = placed.baseline;
        text.fontSize = labelOptions.fontSize ?? 11;
        text.fontWeight = labelOptions.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
        text.fontFamily = labelOptions.fontFamily ?? this.env.theme.fontFamily;
        const elementFill = node.fill ?? this.mainColor();
        text.fill = labelOptions.color ?? (placed.inside ? contrastTextColor(elementFill) : this.env.theme.foregroundColor);
        if (placed.inside) text.outline = elementFill;
        group.append(text);
      }
    });
    if (ctx.highlight && ctx.highlight.seriesId !== this.id) group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    ctx.layer.append(group);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const rect of this.rects) {
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        return { seriesId: this.id, datumIndex: rect.index, distance: 0, x: rect.x + rect.width / 2, y: rect.y };
      }
    }
    return undefined;
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    return {
      heading: String(datum[this.options.xField]),
      rows: [
        {
          label: this.seriesName,
          value: `${datum[this.options.yLowField]} – ${datum[this.options.yHighField]}`,
          color: this.mainColor(),
        },
      ],
    };
  }
}

export const rangeBarSeriesModule: SeriesModule<RangeBarSeriesOptions> = {
  kind: 'series',
  type: 'range-bar',
  requiredOptions: ['xField', 'yLowField', 'yHighField'],
  chartKind: 'cartesian',
  create: (options, env) => new RangeBarSeries(options as RangeBarSeriesOptions & { yField: string }, env),
};
