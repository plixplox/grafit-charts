import {
  CartesianSeries,
  categoryBands,
  labelFont,
  placeRectLabel,
  rectLabelOverflow,
  type RangeTooltipRendererParams,
  type RectLabelPlacement,
  type SeriesBaseOptions,
} from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type {
  CartesianGeometry,
  CartesianRenderContext,
  Insets,
  LabelOverflowContext,
  SeriesModule,
  SeriesPick,
  TooltipContentData,
} from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, FontOptions, LabelOverlapOptions, Switchable } from '@/shared/options';
import { LinearScale, groupSlot } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';
import { extent, contrastTextColor, NO_OVERFLOW, tooltipContentOf } from '@/shared/util';

export interface RangeBarSeriesOptions extends Omit<SeriesBaseOptions<RangeTooltipRendererParams>, 'yField' | 'name'> {
  type: 'range-bar';
  direction?: 'vertical' | 'horizontal';
  yLowField: string;
  yHighField: string;
  name?: string;
  /** Value labels: same placements as bar (top, inner-top, center, …). */
  label?: Switchable &
    FontOptions &
    LabelOverlapOptions & {
      placement?: RectLabelPlacement;
      formatter?: (params: { low: number; high: number; datum: Datum }) => string;
    };
  /**
   * Bar fill. A callback receives each datum and returns a color — use it to
   * paint bars by category/status (e.g. a Gantt chart coloured by task state).
   */
  fill?: ColorValue | RangeBarFillFn;
  fillOpacity?: Fraction;
  cornerRadius?: Pixels;
  /**
   * Gap between bars of one category group — fraction of the slot step
   * (0–0.9, default 0.2). Ignored when the series is alone in the band.
   */
  groupGap?: Fraction;
}

export type RangeBarFillFn = (params: { low: number; high: number; datum: Datum; index: number }) => ColorValue;

interface BarRect {
  index: number;
  low: number;
  high: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class RangeBarSeries extends CartesianSeries<RangeBarSeriesOptions & { yField: string }> {
  readonly type = 'range-bar';
  private rects: BarRect[] = [];

  protected mainColor(): ColorValue {
    // legend/tooltip fall back to the theme colour when fill is a per-datum callback
    return typeof this.options.fill === 'function' ? this.env.colors.fill : (this.options.fill ?? this.env.colors.fill);
  }

  private fillFor(params: { low: number; high: number; datum: Datum; index: number }): ColorValue {
    const fill = this.options.fill;
    return typeof fill === 'function' ? fill(params) : (fill ?? this.env.colors.fill);
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

  override axisKeys(): string[] {
    return [this.options.yLowField, this.options.yHighField];
  }

  /** Bars in plot coordinates; shared by rendering and label measurement (t = 1 there). */
  private layoutBars(ctx: CartesianGeometry, t: number): BarRect[] {
    const valueScale = ctx.swapped ? ctx.xScale : ctx.yScale;
    if (!(valueScale instanceof LinearScale)) {
      throw new Error('grafit: range-bar requires a numeric value axis');
    }
    const bands = categoryBands(ctx);
    const lows = numericValues(ctx.data, this.options.yLowField);
    const highs = numericValues(ctx.data, this.options.yHighField);
    const rects: BarRect[] = [];

    ctx.data.forEach((datum, index) => {
      const low = lows[index];
      const high = highs[index];
      if (low === undefined || high === undefined || Number.isNaN(low) || Number.isNaN(high)) return;
      const band = bands.bandOf(datum[this.options.xField]);
      if (!band) return;
      const slot = groupSlot(band.size, ctx.group, this.options.groupGap);
      const mid = (low + high) / 2;
      const p0 = valueScale.convert(mid + (low - mid) * t);
      const p1 = valueScale.convert(mid + (high - mid) * t);
      const along = band.start + slot.start;
      rects.push(
        ctx.swapped
          ? { index, low, high, x: Math.min(p0, p1), y: along, width: Math.abs(p1 - p0), height: slot.size }
          : { index, low, high, x: along, y: Math.min(p0, p1), width: slot.size, height: Math.abs(p1 - p0) },
      );
    });
    return rects;
  }

  /** Label text of a bar: the formatter over the raw "low – high". */
  private labelTextFor(rect: BarRect, data: Datum[]): string {
    const datum = data[rect.index];
    const formatter = this.options.label?.formatter;
    return formatter && datum ? formatter({ low: rect.low, high: rect.high, datum }) : `${rect.low} – ${rect.high}`;
  }

  override labelOverflow(ctx: LabelOverflowContext): Insets {
    if (!this.visible || this.options.label?.enabled !== true) return NO_OVERFLOW;
    const marks = this.layoutBars(ctx, 1).map((rect) => ({ rect, text: this.labelTextFor(rect, ctx.data) }));
    return rectLabelOverflow(
      marks,
      this.options.label.placement ?? 'top',
      labelFont(this.options.label, this.env.theme),
      ctx.plot,
      ctx.measureText,
    );
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.rects = [];
    if (!this.visible) return;
    const group = new Group();
    const labels = new Group();

    this.rects = this.layoutBars(ctx, ctx.animationT ?? 1);
    this.rects.forEach((rect) => {
      const { index, low, high } = rect;
      const datum = ctx.data[index];
      if (!datum) return;

      const node = new Rect();
      node.x = rect.x;
      node.y = rect.y;
      node.width = rect.width;
      node.height = rect.height;
      node.fill = this.fillFor({ low, high, datum, index });
      node.opacity = this.options.fillOpacity ?? this.env.theme.fillOpacity ?? 0.9;
      node.cornerRadius = this.options.cornerRadius ?? this.env.theme.cornerRadius ?? 3;
      if (ctx.selected?.has(index)) {
        node.stroke = ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
        node.strokeWidth = ctx.selectionStyle?.strokeWidth ?? 1.5;
      }
      if (ctx.selectionActive && !ctx.selected?.has(index)) {
        node.opacity *= ctx.selectionStyle?.inactiveOpacity ?? 0.45;
      }
      group.append(node);

      if (this.options.label?.enabled === true) {
        const labelOptions = this.options.label;
        const placed = placeRectLabel(labelOptions.placement ?? 'top', rect);
        const font = labelFont(labelOptions, this.env.theme);
        const text = new Text();
        text.text = this.labelTextFor(rect, ctx.data);
        text.x = placed.x;
        text.y = placed.y;
        text.textAlign = placed.align;
        text.textBaseline = placed.baseline;
        text.fontSize = font.size;
        text.fontWeight = font.weight;
        text.fontFamily = font.family;
        const elementFill = node.fill ?? this.mainColor();
        text.fill = labelOptions.color ?? (placed.inside ? contrastTextColor(elementFill) : this.env.theme.foregroundColor);
        if (placed.inside) text.outline = elementFill;
        if (this.labelFits(ctx, text, labelOptions.avoidOverlap)) labels.append(text);
      }
    });
    if (ctx.highlight && ctx.highlight.seriesId !== this.id) group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    this.appendGroups(ctx, group, labels);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const rect of this.rects) {
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        return { seriesId: this.id, datumIndex: rect.index, distance: 0, x: rect.x + rect.width / 2, y: rect.y };
      }
    }
    return undefined;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const rect = this.rects.find((candidate) => candidate.index === datumIndex);
    if (!rect) return undefined;
    return { seriesId: this.id, datumIndex, distance: 0, x: rect.x + rect.width / 2, y: rect.y };
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    const low = Number(datum[this.options.yLowField]);
    const high = Number(datum[this.options.yHighField]);
    const color = this.fillFor({ low, high, datum, index: datumIndex });
    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      return tooltipContentOf(
        renderer({
          datum,
          xValue: datum[this.options.xField],
          low: datum[this.options.yLowField],
          high: datum[this.options.yHighField],
          seriesName: this.seriesName,
          color,
        }),
      );
    }
    return {
      heading: String(datum[this.options.xField]),
      rows: [
        {
          label: this.seriesName,
          value: `${datum[this.options.yLowField]} – ${datum[this.options.yHighField]}`,
          color,
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
