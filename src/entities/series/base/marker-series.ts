import { CartesianSeries, type SeriesBaseOptions } from './cartesian-series';
import { placePointLabel, pointLabelOverflow, POINT_LABEL_GAP } from './point-label';
import { labelFont } from './rect-label';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type {
  CartesianGeometry,
  CartesianRenderContext,
  Insets,
  LabelOverflowContext,
  SeriesPick,
  TooltipContentData,
} from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, Styler, FontOptions, Switchable } from '@/shared/options';
import { Group, Marker, Text, type MarkerShape } from '@/shared/scene';
import { contrastTextColor, NO_OVERFLOW } from '@/shared/util';

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
  protected prepare(_ctx: CartesianGeometry): void {}

  /** Marker positions in plot coordinates; shared by rendering and label measurement. */
  protected layoutPoints(ctx: CartesianGeometry): MarkerPoint[] {
    const { data, xScale, yScale } = ctx;
    const values = numericValues(data, this.options.yField);
    const points: MarkerPoint[] = [];
    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) return;
      const x = CartesianSeries.positionOn(xScale, datum[this.options.xField]);
      const y = CartesianSeries.positionOn(yScale, value);
      if (Number.isNaN(x) || Number.isNaN(y)) return;
      points.push({ index, x, y });
    });
    return points;
  }

  /** Distance from the point to its label: the marker radius plus the gap. */
  private labelOffset(index: number): number {
    return this.sizeFor(index) / 2 + POINT_LABEL_GAP;
  }

  private labelTextFor(datum: Datum): string {
    const value = Number(datum[this.options.yField]);
    const formatter = this.options.label?.formatter;
    return formatter ? formatter({ value, datum }) : String(value);
  }

  override labelOverflow(ctx: LabelOverflowContext): Insets {
    const label = this.options.label;
    if (!this.visible || label?.enabled !== true) return NO_OVERFLOW;
    this.prepare(ctx);
    const marks = this.layoutPoints(ctx).flatMap((point) => {
      const datum = ctx.data[point.index];
      return datum ? [{ x: point.x, y: point.y, text: this.labelTextFor(datum), offset: this.labelOffset(point.index) }] : [];
    });
    return pointLabelOverflow(marks, label.placement ?? 'top', labelFont(label, this.env.theme.fontFamily), ctx.plot, ctx.measureText);
  }

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

    const { data } = ctx;
    const group = new Group();
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;

    this.points = this.layoutPoints(ctx);
    this.points.forEach((point) => {
      const { index, x, y } = point;
      const datum = data[index];
      if (!datum) return;

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
      const font = labelFont(labelOptions, this.env.theme.fontFamily);
      for (const point of this.points) {
        const datum = ctx.data[point.index];
        if (!datum) continue;
        const placed = placePointLabel(point.x, point.y, placement, this.labelOffset(point.index));
        const label = new Text();
        label.text = this.labelTextFor(datum);
        label.x = placed.x;
        label.y = placed.y;
        label.textAlign = placed.align;
        label.textBaseline = placed.baseline;
        label.fontSize = font.size;
        label.fontWeight = font.weight;
        label.fontFamily = font.family;
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
