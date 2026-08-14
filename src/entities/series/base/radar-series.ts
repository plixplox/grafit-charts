import { placePointLabel, POINT_LABEL_GAP, type PointLabelPlacement } from './point-label';
import { PolarSeries, type PolarSeriesBaseOptions } from './polar-series';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY, FONT_STEP, themeFont } from '@/shared/kernel';
import type { LegendItemDescriptor, PolarRenderContext, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels, Fraction, Switchable } from '@/shared/options';
import { Group, Marker, Path, Text, type MarkerShape } from '@/shared/scene';
import { contrastTextColor, extent } from '@/shared/util';

export interface RadarSeriesBaseOptions extends PolarSeriesBaseOptions {
  /** Category along the angle. */
  angleField: string;
  /** Value along the radius. */
  radiusField: string;
  name?: string;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  fillOpacity?: Fraction;
  marker?: Switchable & { shape?: MarkerShape; size?: Pixels };
  /**
   * Value labels on the vertices. `placement` hangs the label off its point:
   * `'outward'` (the default) pushes it away from the centre along the spoke,
   * where the web is empty whichever way the point leans; the four sides and
   * `'inside'` behave as they do on a line.
   */
  label?: Switchable &
    FontOptions & {
      placement?: RadarLabelPlacement;
      formatter?: (params: { value: number; datum: Datum }) => string;
    };
  tooltip?: Switchable & {
    renderer?: (params: RadarTooltipRendererParams) => TooltipContentData | string;
  };
}

/** Where a vertex label sits: along the spoke, or off one of the four sides. */
export type RadarLabelPlacement = PointLabelPlacement | 'outward';

export interface RadarTooltipRendererParams {
  datum: Datum;
  /** Category along the angle (angleField). */
  label: string;
  /** Value of radiusField. */
  value: unknown;
  seriesName: string;
  color: ColorValue;
}

const PICK_RANGE = 30;
interface RadarPoint {
  index: number;
  x: number;
  y: number;
  /** Angle of the spoke the point sits on — where an outward label leans. */
  angle: number;
  value: number;
}

/** Base for radar-line / radar-area: points by category on a circle. */
export abstract class RadarSeries<O extends RadarSeriesBaseOptions = RadarSeriesBaseOptions> extends PolarSeries<O> {
  protected points: RadarPoint[] = [];

  /** Whether to fill the polygon (radar-area). */
  protected abstract filled(): boolean;

  protected mainColor(): ColorValue {
    return this.options.stroke ?? this.env.colors.stroke;
  }

  protected get seriesName(): string {
    return this.options.name ?? this.options.radiusField;
  }

  override angleValues(data: Datum[]): unknown[] {
    return data.map((datum) => datum[this.options.angleField]);
  }

  override valueFields(): string[] {
    return [this.options.radiusField];
  }

  override radiusDomain(data: Datum[]): [number, number] | undefined {
    const domain = extent(numericValues(data, this.options.radiusField));
    if (!domain) return undefined;
    return [Math.min(0, domain[0]), domain[1]];
  }

  update(ctx: PolarRenderContext): void {
    this.lastCtx = ctx;
    this.points = [];
    if (!this.visible || !ctx.angleScale || !ctx.radiusScale) return;

    const { data, centerX, centerY, angleScale, radiusScale } = ctx;
    const values = numericValues(data, this.options.radiusField);
    const t = ctx.animationT ?? 1;

    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) return;
      const angle = angleScale.center(datum[this.options.angleField]);
      if (Number.isNaN(angle)) return;
      const radius = radiusScale.convert(value) * t;
      const point = PolarSeries.pointAt(centerX, centerY, angle, radius);
      this.points.push({ index, x: point.x, y: point.y, angle, value });
    });
    if (this.points.length === 0) return;

    const group = new Group();
    const path = new Path();
    this.points.forEach((point, i) => {
      if (i === 0) path.moveTo(point.x, point.y);
      else path.lineTo(point.x, point.y);
    });
    path.closePath();
    path.stroke = this.mainColor();
    path.strokeWidth = this.options.strokeWidth ?? this.env.theme.strokeWidth;
    if (this.env.theme.lineDash?.length) path.lineDash = this.env.theme.lineDash;
    if (this.filled()) {
      path.fill = this.mainColor();
      path.opacity = this.options.fillOpacity ?? this.env.theme.fillOpacity ?? 0.25;
      const outline = new Path();
      this.points.forEach((point, i) => {
        if (i === 0) outline.moveTo(point.x, point.y);
        else outline.lineTo(point.x, point.y);
      });
      outline.closePath();
      outline.stroke = this.mainColor();
      outline.strokeWidth = this.options.strokeWidth ?? this.env.theme.strokeWidth;
      group.append(path, outline);
    } else {
      group.append(path);
    }

    if (this.options.marker?.enabled !== false) {
      const highlighted =
        ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;
      for (const point of this.points) {
        const marker = new Marker();
        marker.x = point.x;
        marker.y = point.y;
        marker.shape = this.options.marker?.shape ?? 'circle';
        const base = this.options.marker?.size ?? 6;
        const isSelected = ctx.selected?.has(point.index) === true;
        marker.size = isSelected
          ? base * (ctx.selectionStyle?.sizeRatio ?? 1.4)
          : point.index === highlighted
            ? base * (1 + 0.5 * (ctx.highlightT ?? 1))
            : base;
        marker.fill = this.mainColor();
        marker.stroke = isSelected ? (ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor) : this.env.theme.backgroundColor;
        marker.strokeWidth = isSelected ? (ctx.selectionStyle?.strokeWidth ?? 2) : 1.2;
        if (ctx.selectionActive && !isSelected) marker.opacity = ctx.selectionStyle?.inactiveOpacity ?? 0.45;
        group.append(marker);
      }
    } else if (ctx.selected && ctx.selected.size > 0) {
      for (const point of this.points) {
        if (!ctx.selected.has(point.index)) continue;
        const marker = new Marker();
        marker.x = point.x;
        marker.y = point.y;
        marker.size = 6 * (ctx.selectionStyle?.sizeRatio ?? 1.4);
        marker.fill = this.mainColor();
        marker.stroke = ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
        marker.strokeWidth = ctx.selectionStyle?.strokeWidth ?? 2;
        group.append(marker);
      }
    }

    if (this.options.label?.enabled === true) {
      for (const point of this.points) this.appendLabel(group, point, data[point.index]);
    }

    if (ctx.highlight && !ctx.highlight.allSeries && ctx.highlight.seriesId !== this.id) {
      group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    }
    ctx.layer.append(group);
  }

  /**
   * The value of one vertex, hung off its point. An outward label leans along
   * the spoke: the web has no room inside the polygon, and which way "outside"
   * points depends on where on the circle the vertex is.
   */
  private appendLabel(group: Group, point: RadarPoint, datum: Datum | undefined): void {
    const options = this.options.label;
    if (!datum) return;
    const label = new Text();
    label.text = options?.formatter ? options.formatter({ value: point.value, datum }) : String(datum[this.options.radiusField]);
    const placement = options?.placement ?? 'outward';
    const offset = (this.options.marker?.enabled === false ? 0 : (this.options.marker?.size ?? 6) / 2) + POINT_LABEL_GAP;
    if (placement === 'outward') {
      const dx = Math.sin(point.angle);
      const dy = -Math.cos(point.angle);
      label.x = point.x + dx * offset;
      label.y = point.y + dy * offset;
      label.textAlign = dx > 0.3 ? 'left' : dx < -0.3 ? 'right' : 'center';
      label.textBaseline = dy > 0.3 ? 'top' : dy < -0.3 ? 'bottom' : 'middle';
    } else {
      const placed = placePointLabel(point.x, point.y, placement, placement === 'inside' ? 0 : offset);
      label.x = placed.x;
      label.y = placed.y;
      label.textAlign = placed.align;
      label.textBaseline = placed.baseline;
    }
    label.fontSize = options?.fontSize ?? themeFont(this.env.theme, FONT_STEP.label);
    label.fontFamily = options?.fontFamily ?? this.env.theme.fontFamily;
    if (options?.fontWeight !== undefined) label.fontWeight = String(options.fontWeight);
    label.fill = options?.color ?? (placement === 'inside' ? contrastTextColor(this.mainColor()) : this.env.theme.foregroundColor);
    if (placement === 'inside') label.outline = this.mainColor();
    group.append(label);
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

  override pickInRect(x0: number, y0: number, x1: number, y1: number): number[] {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    return this.points.filter((point) => point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY).map((point) => point.index);
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const point = this.points.find((candidate) => candidate.index === datumIndex);
    if (!point) return undefined;
    return { seriesId: this.id, datumIndex, distance: 0, x: point.x, y: point.y };
  }

  tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.data[datumIndex];
    if (!datum) return { rows: [] };
    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      const result = renderer({
        datum,
        label: String(datum[this.options.angleField]),
        value: datum[this.options.radiusField],
        seriesName: this.seriesName,
        color: this.mainColor(),
      });
      return typeof result === 'string' ? { heading: result, rows: [] } : result;
    }
    return {
      heading: String(datum[this.options.angleField]),
      rows: [{ label: this.seriesName, value: String(datum[this.options.radiusField]), color: this.mainColor() }],
    };
  }

  legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    return [{ seriesId: this.id, label: this.seriesName, color: this.mainColor(), visible: this.visible }];
  }
}
