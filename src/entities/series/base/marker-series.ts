import { CartesianSeries, type SeriesBaseOptions } from './cartesian-series';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianRenderContext, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, Styler, FontOptions, Switchable } from '@/shared/options';
import { Group, Marker, Text, type MarkerShape } from '@/shared/scene';
import { contrastTextColor } from '@/shared/util';

export interface MarkerItemStylerParams {
  datum: Datum;
  index: number;
  highlighted: boolean;
  fill: ColorValue;
  stroke: ColorValue | undefined;
  size: Pixels;
}

export interface MarkerItemStyle {
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  size?: Pixels;
}

export interface MarkerSeriesBaseOptions extends SeriesBaseOptions {
  /** Y value name in the tooltip (yField by default). */
  yName?: string;
  shape?: MarkerShape;
  size?: Pixels;
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  itemStyler?: Styler<MarkerItemStylerParams, MarkerItemStyle>;
  /** Value labels at points: top (by default) / bottom / left / right. */
  label?: Switchable &
    FontOptions & {
      /** inside — within the marker (for bubble), auto-contrast + outline. */
      placement?: 'top' | 'bottom' | 'left' | 'right' | 'inside';
      formatter?: (params: { value: number; datum: Datum }) => string;
    };
}

const PICK_RANGE = 30;
interface MarkerPoint {
  index: number;
  x: number;
  y: number;
}

/** Shared base for point series (scatter, bubble). */
export abstract class MarkerSeries<O extends MarkerSeriesBaseOptions> extends CartesianSeries<O> {
  protected points: MarkerPoint[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  preferredXAxisType(): 'number' {
    return 'number';
  }

  /** Point marker size (bubble overrides it based on sizeField). */
  protected sizeFor(_index: number): Pixels {
    return this.options.size ?? 8;
  }

  /** Hook before iterating the data (bubble computes the size domain). */
  protected prepare(_ctx: CartesianRenderContext): void {}

  override tooltipFor(datumIndex: number, mode?: 'single' | 'shared'): TooltipContentData {
    if (this.options.tooltip?.renderer || mode === 'shared') return super.tooltipFor(datumIndex);
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    // both axes of a point series are measures, so the x value is a labelled
    // row like the others, and the heading identifies the series (marker + name)
    return {
      heading: { text: this.seriesName, color: this.mainColor() },
      rows: [
        { label: this.options.xName ?? this.options.xField, value: String(datum[this.options.xField]) },
        { label: this.options.yName ?? this.options.yField, value: String(datum[this.options.yField]) },
      ],
    };
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.points = [];
    if (!this.visible) return;
    this.prepare(ctx);

    const { data, xScale, yScale } = ctx;
    const values = numericValues(data, this.options.yField);
    const group = new Group();
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;

    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) return;
      const x = CartesianSeries.positionOn(xScale, datum[this.options.xField]);
      const y = CartesianSeries.positionOn(yScale, value);
      if (Number.isNaN(x) || Number.isNaN(y)) return;
      this.points.push({ index, x, y });

      const isHighlighted = index === highlighted;
      const isSelected = ctx.selected?.has(index) === true;
      const style = ctx.selectionStyle;
      const baseSize = this.sizeFor(index);
      let fill = this.mainColor();
      let stroke = isSelected ? (style?.stroke ?? this.env.theme.foregroundColor) : this.options.stroke;
      let strokeWidth = isSelected ? (style?.strokeWidth ?? 2) : (this.options.strokeWidth ?? 1);
      let size = isSelected ? baseSize * (style?.sizeRatio ?? 1.4) : isHighlighted ? baseSize * 1.4 : baseSize;
      const styler = this.options.itemStyler;
      if (styler) {
        const style = styler({ datum, index, highlighted: isHighlighted, fill, stroke, size });
        fill = style?.fill ?? fill;
        stroke = style?.stroke ?? stroke;
        strokeWidth = style?.strokeWidth ?? strokeWidth;
        size = style?.size ?? size;
      }

      const marker = new Marker();
      marker.x = x;
      marker.y = y;
      marker.shape = this.options.shape ?? 'circle';
      marker.size = size;
      marker.fill = fill;
      marker.opacity = this.options.fillOpacity ?? 0.85;
      marker.stroke = stroke ?? this.env.theme.backgroundColor;
      marker.strokeWidth = strokeWidth;
      if (ctx.selectionActive && !isSelected) marker.opacity = (this.options.fillOpacity ?? 0.85) * (style?.inactiveOpacity ?? 0.45);
      group.append(marker);
    });

    if (ctx.highlight && !ctx.highlight.allSeries && ctx.highlight.seriesId !== this.id) {
      group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    }
    group.opacity *= ctx.animationT ?? 1;

    if (this.options.label?.enabled === true) {
      const labelOptions = this.options.label;
      const placement = labelOptions.placement ?? 'top';
      for (const point of this.points) {
        const datum = ctx.data[point.index];
        if (!datum) continue;
        const offset = this.sizeFor(point.index) / 2 + 5;
        const value = Number(datum[this.options.yField]);
        const label = new Text();
        label.text = labelOptions.formatter ? labelOptions.formatter({ value, datum }) : String(value);
        label.x = point.x + (placement === 'left' ? -offset : placement === 'right' ? offset : 0);
        label.y = point.y + (placement === 'top' ? -offset : placement === 'bottom' ? offset : 0);
        label.textAlign = placement === 'left' ? 'right' : placement === 'right' ? 'left' : 'center';
        label.textBaseline = placement === 'top' ? 'bottom' : placement === 'bottom' ? 'top' : 'middle';
        label.fontSize = labelOptions.fontSize ?? 11;
        label.fontWeight = labelOptions.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
        label.fontFamily = labelOptions.fontFamily ?? this.env.theme.fontFamily;
        if (placement === 'inside') {
          label.fill = labelOptions.color ?? contrastTextColor(this.mainColor());
          label.outline = this.mainColor();
        } else {
          label.fill = labelOptions.color ?? this.env.theme.foregroundColor;
          label.outline = this.env.theme.backgroundColor;
        }
        group.append(label);
      }
    }

    ctx.layer.append(group);
  }

  pickInRect(x0: number, y0: number, x1: number, y1: number): number[] {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    return this.points
      .filter((point) => point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY)
      .map((point) => point.index);
  }

  pick(x: number, y: number, searchRadius?: number): SeriesPick | undefined {
    const limit = searchRadius === 0 ? 6 : (searchRadius ?? PICK_RANGE);
    let best: SeriesPick | undefined;
    for (const point of this.points) {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= limit && (best === undefined || distance < best.distance)) {
        best = { seriesId: this.id, datumIndex: point.index, distance, x: point.x, y: point.y };
      }
    }
    return best;
  }
}
