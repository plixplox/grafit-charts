import { CartesianSeries, type SeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianRenderContext, SeriesModule, SeriesPick } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Marker, Path, Text, type MarkerShape } from '@/shared/scene';

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
interface LinePoint {
  index: number;
  x: number;
  y: number;
}

export class LineSeries extends CartesianSeries<LineSeriesOptions> {
  readonly type = 'line';
  private points: LinePoint[] = [];

  protected mainColor(): ColorValue {
    return this.options.stroke ?? this.env.colors.stroke;
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.points = [];
    if (!this.visible) return;

    const { data, xScale, yScale, swapped } = ctx;
    const values = numericValues(data, this.options.yField);
    const group = new Group();
    const path = new Path();
    path.stroke = this.mainColor();
    path.strokeWidth = this.options.strokeWidth ?? 2;
    if (this.options.lineDash) path.lineDash = this.options.lineDash;

    let penDown = false;
    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) {
        penDown = false;
        return;
      }
      const category = datum[this.options.xField];
      const x = swapped ? xScale.convert(value) : CartesianSeries.positionOn(xScale, category);
      const y = swapped ? CartesianSeries.positionOn(yScale, category) : yScale.convert(value);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        penDown = false;
        return;
      }
      if (penDown) {
        path.lineTo(x, y);
      } else {
        path.moveTo(x, y);
        penDown = true;
      }
      this.points.push({ index, x, y });
    });
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
        const baseSize = markerOptions?.size ?? 7;
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
      const offset = (markerOptions?.size ?? 7) / 2 + 5;
      for (const point of this.points) {
        const datum = ctx.data[point.index];
        if (!datum) continue;
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
