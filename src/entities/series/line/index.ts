import {
  CartesianSeries,
  labelFont,
  placePointLabel,
  pointLabelOverflow,
  POINT_LABEL_GAP,
  type SeriesBaseOptions,
} from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianGeometry, CartesianRenderContext, Insets, LabelOverflowContext, SeriesModule, SeriesPick } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Marker, Path, Text, type MarkerShape } from '@/shared/scene';
import { NO_OVERFLOW } from '@/shared/util';

export interface LineSeriesOptions extends SeriesBaseOptions {
  type: 'line';
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  lineDash?: Pixels[];
  marker?: Switchable & {
    shape?: MarkerShape;
    size?: Pixels;
    fill?: ColorValue;
    stroke?: ColorValue;
    strokeWidth?: Pixels;
  };
  /** Value labels at points: top (by default) / bottom / left / right. */
  label?: Switchable &
    FontOptions & {
      placement?: 'top' | 'bottom' | 'left' | 'right';
      formatter?: (params: { value: number; datum: Datum }) => string;
    };
}

const PICK_RANGE = 30;
const DEFAULT_MARKER_SIZE = 7;

interface LinePoint {
  index: number;
  x: number;
  y: number;
  /** The pen was lifted before this point: a missing value broke the line. */
  gapBefore: boolean;
}

export class LineSeries extends CartesianSeries<LineSeriesOptions> {
  readonly type = 'line';
  private points: LinePoint[] = [];

  protected mainColor(): ColorValue {
    return this.options.stroke ?? this.env.colors.stroke;
  }

  /**
   * Points of the line in plot coordinates. gapBefore marks where the pen was
   * lifted — a missing value breaks the line instead of bridging it.
   */
  private layoutPoints(ctx: CartesianGeometry): LinePoint[] {
    const { data, xScale, yScale, swapped } = ctx;
    const values = numericValues(data, this.options.yField);
    const points: LinePoint[] = [];
    let broken = true;
    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) {
        broken = true;
        return;
      }
      const category = datum[this.options.xField];
      const x = swapped ? xScale.convert(value) : CartesianSeries.positionOn(xScale, category);
      const y = swapped ? CartesianSeries.positionOn(yScale, category) : yScale.convert(value);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        broken = true;
        return;
      }
      points.push({ index, x, y, gapBefore: broken });
      broken = false;
    });
    return points;
  }

  private labelTextFor(datum: Datum): string {
    const value = Number(datum[this.options.yField]);
    const formatter = this.options.label?.formatter;
    return formatter ? formatter({ value, datum }) : String(value);
  }

  override labelOverflow(ctx: LabelOverflowContext): Insets {
    const label = this.options.label;
    if (!this.visible || label?.enabled !== true) return NO_OVERFLOW;
    const offset = (this.options.marker?.size ?? DEFAULT_MARKER_SIZE) / 2 + POINT_LABEL_GAP;
    const marks = this.layoutPoints(ctx).flatMap((point) => {
      const datum = ctx.data[point.index];
      return datum ? [{ x: point.x, y: point.y, text: this.labelTextFor(datum), offset }] : [];
    });
    return pointLabelOverflow(marks, label.placement ?? 'top', labelFont(label, this.env.theme), ctx.plot, ctx.measureText);
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.points = [];
    if (!this.visible) return;

    const group = new Group();
    const path = new Path();
    path.stroke = this.mainColor();
    path.strokeWidth = this.options.strokeWidth ?? this.env.theme.strokeWidth;
    const dash = this.options.lineDash ?? this.env.theme.lineDash;
    if (dash?.length) path.lineDash = dash;

    this.points = this.layoutPoints(ctx);
    for (const point of this.points) {
      if (point.gapBefore) path.moveTo(point.x, point.y);
      else path.lineTo(point.x, point.y);
    }
    group.append(path);

    const markerOptions = this.options.marker;
    if (markerOptions?.enabled !== false) {
      const highlighted =
        ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;
      for (const point of this.points) {
        const marker = new Marker();
        marker.x = point.x;
        marker.y = point.y;
        marker.shape = markerOptions?.shape ?? 'circle';
        const baseSize = markerOptions?.size ?? DEFAULT_MARKER_SIZE;
        const style = ctx.selectionStyle;
        const isSelected = ctx.selected?.has(point.index) === true;
        marker.size = isSelected ? baseSize * (style?.sizeRatio ?? 1.5) : point.index === highlighted ? baseSize * 1.5 : baseSize;
        marker.fill = markerOptions?.fill ?? this.mainColor();
        marker.stroke = isSelected
          ? (style?.stroke ?? this.env.theme.foregroundColor)
          : (markerOptions?.stroke ?? this.env.theme.backgroundColor);
        marker.strokeWidth = isSelected ? (style?.strokeWidth ?? 2) : (markerOptions?.strokeWidth ?? 1.5);
        if (ctx.selectionActive && !isSelected) marker.opacity = style?.inactiveOpacity ?? 0.45;
        group.append(marker);
      }
    }

    if (this.options.label?.enabled === true) {
      const labelOptions = this.options.label;
      const placement = labelOptions.placement ?? 'top';
      const offset = (markerOptions?.size ?? DEFAULT_MARKER_SIZE) / 2 + POINT_LABEL_GAP;
      const font = labelFont(labelOptions, this.env.theme);
      for (const point of this.points) {
        const datum = ctx.data[point.index];
        if (!datum) continue;
        const placed = placePointLabel(point.x, point.y, placement, offset);
        const label = new Text();
        label.text = this.labelTextFor(datum);
        label.x = placed.x;
        label.y = placed.y;
        label.textAlign = placed.align;
        label.textBaseline = placed.baseline;
        label.fontSize = font.size;
        label.fontWeight = font.weight;
        label.fontFamily = font.family;
        label.fill = labelOptions.color ?? this.env.theme.foregroundColor;
        label.outline = this.env.theme.backgroundColor;
        group.append(label);
      }
    }

    if (ctx.highlight && !ctx.highlight.allSeries && ctx.highlight.seriesId !== this.id) {
      group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    }
    group.opacity *= ctx.animationT ?? 1;
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

export const lineSeriesModule: SeriesModule<LineSeriesOptions> = {
  kind: 'series',
  type: 'line',
  requiredOptions: ['xField', 'yField'],
  chartKind: 'cartesian',
  create: (options, env) => new LineSeries(options, env),
};
