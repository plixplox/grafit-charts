import { CartesianSeries, placeRectLabel, type RectLabelPlacement, type SeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianRenderContext, SeriesModule, SeriesPick, StackSegment } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels, Fraction, Switchable } from '@/shared/options';
import { BandScale, LinearScale, groupSlot } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';
import { contrastTextColor } from '@/shared/util';
import { extent } from '@/shared/util';

export interface BarSeriesOptions extends SeriesBaseOptions {
  type: 'bar';
  direction?: 'vertical' | 'horizontal';
  stacked?: boolean;
  stackGroup?: string;
  /** Normalize the stack to a total (100 — percentage stack); only with stacked. */
  normalizedTo?: number;
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  cornerRadius?: Pixels;
  /**
   * Gap between bars of one category group — fraction of the slot step
   * (0–0.9, default 0.2). Ignored when the series is alone in the band.
   */
  groupGap?: Fraction;
  /**
   * Value labels. Outer placements: top/bottom/left/right and corners
   * (top-left, …); center and inner-* are inside the bar (auto-contrast + outline).
   */
  label?: Switchable &
    FontOptions & {
      placement?: BarLabelPlacement;
      formatter?: (params: { value: number; datum: Datum }) => string;
    };
}

export type BarLabelPlacement = RectLabelPlacement;

interface BarRect {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class BarSeries extends CartesianSeries<BarSeriesOptions> {
  readonly type = 'bar';
  private rects: BarRect[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  override yDomain(data: Datum[], stack?: StackSegment): [number, number] | undefined {
    // bars grow from zero — zero is always in the domain
    const domain = stack ? extent([...stack.y0, ...stack.y1]) : extent(numericValues(data, this.options.yField));
    if (!domain) return undefined;
    return [Math.min(0, domain[0]), Math.max(0, domain[1])];
  }

  override stackParticipation(): { key: string; stackGroup: string; normalizedTo?: number } | undefined {
    if (!this.options.stacked) return undefined;
    return {
      key: this.options.yField,
      stackGroup: this.options.stackGroup ?? 'default',
      normalizedTo: this.options.normalizedTo,
    };
  }

  override occupiesBandSlot(): boolean {
    return true;
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.rects = [];
    if (!this.visible) return;

    const { data, swapped } = ctx;
    const bandScale = swapped ? ctx.yScale : ctx.xScale;
    const valueScale = swapped ? ctx.xScale : ctx.yScale;
    if (!(bandScale instanceof BandScale) || !(valueScale instanceof LinearScale)) {
      throw new Error('grafit: bar series requires a band category axis and a numeric value axis');
    }

    const slot = groupSlot(bandScale.bandwidth, ctx.group, this.options.groupGap);
    const values = numericValues(data, this.options.yField);

    const group = new Group();

    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) return;
      const bandStart = bandScale.convert(datum[this.options.xField]);
      if (Number.isNaN(bandStart)) return;

      const v0 = ctx.stack ? (ctx.stack.y0[index] ?? 0) : 0;
      const v1 = ctx.stack ? (ctx.stack.y1[index] ?? 0) : value;
      const t = ctx.animationT ?? 1;
      const zero = valueScale.convert(0);
      const p0 = zero + (valueScale.convert(v0) - zero) * t;
      const p1 = zero + (valueScale.convert(v1) - zero) * t;
      const along = bandStart + slot.start;

      const rect: BarRect = swapped
        ? {
            index,
            x: Math.min(p0, p1),
            y: along,
            width: Math.abs(p1 - p0),
            height: slot.size,
          }
        : {
            index,
            x: along,
            y: Math.min(p0, p1),
            width: slot.size,
            height: Math.abs(p1 - p0),
          };
      this.rects.push(rect);

      const node = new Rect();
      node.x = rect.x;
      node.y = rect.y;
      node.width = rect.width;
      node.height = rect.height;
      node.fill = this.mainColor();
      node.opacity = this.options.fillOpacity ?? 1;
      node.cornerRadius = this.options.cornerRadius ?? 0;
      if (ctx.selected?.has(index)) {
        node.stroke = ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
        node.strokeWidth = ctx.selectionStyle?.strokeWidth ?? 1.5;
      } else if (this.options.stroke) {
        node.stroke = this.options.stroke;
        node.strokeWidth = this.options.strokeWidth ?? 1;
      }
      if (ctx.selectionActive && !ctx.selected?.has(index)) {
        node.opacity *= ctx.selectionStyle?.inactiveOpacity ?? 0.45;
      }
      group.append(node);

      if (this.options.label?.enabled === true) {
        const labelOptions = this.options.label;
        const value = Number(datum[this.options.yField]);
        const placed = placeRectLabel(labelOptions.placement ?? 'top', rect);
        const text = new Text();
        text.text = labelOptions.formatter ? labelOptions.formatter({ value, datum }) : String(value);
        text.x = placed.x;
        text.y = placed.y;
        text.textAlign = placed.align;
        text.textBaseline = placed.baseline;
        text.fontSize = labelOptions.fontSize ?? 11;
        text.fontWeight = labelOptions.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
        text.fontFamily = labelOptions.fontFamily ?? this.env.theme.fontFamily;
        const barFill = node.fill ?? this.mainColor();
        text.fill = labelOptions.color ?? (placed.inside ? contrastTextColor(barFill) : this.env.theme.foregroundColor);
        if (placed.inside) text.outline = barFill;
        group.append(text);
      }
    });

    if (ctx.highlight && !ctx.highlight.allSeries && ctx.highlight.seriesId !== this.id) {
      group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    }
    ctx.layer.append(group);
  }

  pickInRect(x0: number, y0: number, x1: number, y1: number): number[] {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    return this.rects
      .filter((rect) => rect.x < maxX && rect.x + rect.width > minX && rect.y < maxY && rect.y + rect.height > minY)
      .map((rect) => rect.index);
  }

  pick(x: number, y: number, searchRadius?: number): SeriesPick | undefined {
    for (const rect of this.rects) {
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        return {
          seriesId: this.id,
          datumIndex: rect.index,
          distance: 0,
          x: rect.x + rect.width / 2,
          y: rect.y,
          centerX: rect.x + rect.width / 2,
          centerY: rect.y + rect.height / 2,
        };
      }
    }
    // nearest: closest bar along the category axis from anywhere in the plot
    if (searchRadius === Infinity) {
      const horizontal = this.lastCtx?.swapped === true;
      let best: SeriesPick | undefined;
      for (const rect of this.rects) {
        const center = horizontal ? rect.y + rect.height / 2 : rect.x + rect.width / 2;
        const pointer = horizontal ? y : x;
        const distance = Math.abs(center - pointer);
        if (best === undefined || distance < best.distance) {
          best = { seriesId: this.id, datumIndex: rect.index, distance, x: rect.x + rect.width / 2, y: rect.y };
        }
      }
      return best;
    }
    return undefined;
  }
}

export const barSeriesModule: SeriesModule<BarSeriesOptions> = {
  kind: 'series',
  type: 'bar',
  requiredOptions: ['xField', 'yField'],
  chartKind: 'cartesian',
  create: (options, env) => new BarSeries(options, env),
};
