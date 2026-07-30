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
import type {
  CartesianGeometry,
  CartesianRenderContext,
  Insets,
  LabelOverflowContext,
  SeriesModule,
  SeriesPick,
  StackSegment,
} from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, Switchable, FontOptions } from '@/shared/options';
import { LinearScale } from '@/shared/scale';
import { Group, Marker, Path, type MarkerShape, Text } from '@/shared/scene';
import { extent, NO_OVERFLOW } from '@/shared/util';

export interface AreaSeriesOptions extends SeriesBaseOptions {
  type: 'area';
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  lineDash?: Pixels[];
  stacked?: boolean;
  stackGroup?: string;
  /** Normalize the stack to a total (100 — percentage stack); only with stacked. */
  normalizedTo?: number;
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

interface AreaPoint {
  index: number;
  x: number;
  y: number;
  y0: number;
}

export class AreaSeries extends CartesianSeries<AreaSeriesOptions> {
  readonly type = 'area';
  private points: AreaPoint[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  override yDomain(data: Datum[], stack?: StackSegment): [number, number] | undefined {
    const domain = stack ? extent([...stack.y0, ...stack.y1]) : extent(numericValues(data, this.options.yField));
    if (!domain) return undefined;
    // the area is filled from zero
    return [Math.min(0, domain[0]), Math.max(0, domain[1])];
  }

  override stackParticipation(): { key: string; stackGroup: string; normalizedTo?: number } | undefined {
    if (!this.options.stacked) return undefined;
    return {
      key: this.options.yField,
      stackGroup: this.options.stackGroup ?? 'area',
      normalizedTo: this.options.normalizedTo,
    };
  }

  /** Points of the area in plot coordinates; y0 is the baseline the fill drops to. */
  private layoutPoints(ctx: CartesianGeometry): AreaPoint[] {
    const { data, xScale, yScale } = ctx;
    if (!(yScale instanceof LinearScale)) {
      throw new Error('grafit: area series requires a numeric value axis');
    }
    const values = numericValues(data, this.options.yField);
    const points: AreaPoint[] = [];
    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) return;
      const x = CartesianSeries.positionOn(xScale, datum[this.options.xField]);
      if (Number.isNaN(x)) return;
      const v1 = ctx.stack ? (ctx.stack.y1[index] ?? 0) : value;
      const v0 = ctx.stack ? (ctx.stack.y0[index] ?? 0) : 0;
      points.push({ index, x, y: yScale.convert(v1), y0: yScale.convert(v0) });
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

    this.points = this.layoutPoints(ctx);
    if (this.points.length === 0) return;

    const group = new Group();
    const fillPath = new Path();
    fillPath.fill = this.mainColor();
    fillPath.opacity = this.options.fillOpacity ?? this.env.theme.fillOpacity ?? 0.35;
    this.points.forEach((point, i) => {
      if (i === 0) fillPath.moveTo(point.x, point.y);
      else fillPath.lineTo(point.x, point.y);
    });
    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i];
      if (point) fillPath.lineTo(point.x, point.y0);
    }
    fillPath.closePath();
    group.append(fillPath);

    const strokePath = new Path();
    strokePath.stroke = this.options.stroke ?? this.mainColor();
    strokePath.strokeWidth = this.options.strokeWidth ?? this.env.theme.strokeWidth;
    const dash = this.options.lineDash ?? this.env.theme.lineDash;
    if (dash?.length) strokePath.lineDash = dash;
    this.points.forEach((point, i) => {
      if (i === 0) strokePath.moveTo(point.x, point.y);
      else strokePath.lineTo(point.x, point.y);
    });
    group.append(strokePath);

    const markerOptions = this.options.marker;
    if (ctx.selected && ctx.selected.size > 0) {
      for (const point of this.points) {
        if (!ctx.selected.has(point.index)) continue;
        const marker = new Marker();
        marker.x = point.x;
        marker.y = point.y;
        marker.size = (markerOptions?.size ?? 7) * (ctx.selectionStyle?.sizeRatio ?? 1.4);
        marker.fill = this.mainColor();
        marker.stroke = ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
        marker.strokeWidth = ctx.selectionStyle?.strokeWidth ?? 2;
        group.append(marker);
      }
    }
    if (markerOptions?.enabled === true) {
      const highlighted =
        ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;
      for (const point of this.points) {
        const marker = new Marker();
        marker.x = point.x;
        marker.y = point.y;
        marker.shape = markerOptions.shape ?? 'circle';
        const baseSize = markerOptions.size ?? 7;
        marker.size = point.index === highlighted ? baseSize * 1.5 : baseSize;
        marker.fill = markerOptions.fill ?? this.mainColor();
        marker.stroke = markerOptions.stroke ?? this.env.theme.backgroundColor;
        marker.strokeWidth = markerOptions.strokeWidth ?? 1.5;
        group.append(marker);
      }
    }

    if (ctx.highlight && !ctx.highlight.allSeries && ctx.highlight.seriesId !== this.id) {
      group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    }
    group.opacity *= ctx.animationT ?? 1;

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

export const areaSeriesModule: SeriesModule<AreaSeriesOptions> = {
  kind: 'series',
  type: 'area',
  requiredOptions: ['xField', 'yField'],
  chartKind: 'cartesian',
  create: (options, env) => new AreaSeries(options, env),
};
