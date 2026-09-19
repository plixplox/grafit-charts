import {
  CartesianSeries,
  styleMarkerItem,
  type MarkerItemStyle,
  type MarkerItemStylerParams,
  type RangeTooltipRendererParams,
  type SeriesBaseOptions,
} from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianRenderContext, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, Styler, Switchable } from '@/shared/options';
import { LinearScale } from '@/shared/scale';
import { Group, Marker, Path, type MarkerShape } from '@/shared/scene';
import { extent, tooltipContentOf } from '@/shared/util';

export interface RangeAreaSeriesOptions extends Omit<SeriesBaseOptions<RangeTooltipRendererParams>, 'yField' | 'name'> {
  type: 'range-area';
  yLowField: string;
  yHighField: string;
  name?: string;
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  /**
   * Markers on both edges of the range. Off by default; showOn: 'hover' turns
   * them on for the highlighted datum alone.
   */
  marker?: Switchable & {
    /** 'always' — markers at every datum; 'hover' — only at the highlighted one. */
    showOn?: 'always' | 'hover';
    shape?: MarkerShape;
    size?: Pixels;
    fill?: ColorValue;
    stroke?: ColorValue;
    strokeWidth?: Pixels;
    /**
     * Style of one marker by its datum, called for each edge. Undefined leaves
     * the marker as it is; a partial style is laid over it. The band keeps the
     * series color.
     */
    itemStyler?: Styler<RangeAreaItemStylerParams, MarkerItemStyle>;
  };
}

/** What the marker styler of a range area is handed: which edge the marker is on, and the range. */
export interface RangeAreaItemStylerParams extends MarkerItemStylerParams {
  edge: 'high' | 'low';
  low: number;
  high: number;
}

interface RangePoint {
  index: number;
  x: number;
  yLow: number;
  yHigh: number;
}

const PICK_RANGE = 30;
const DEFAULT_MARKER_SIZE = 7;
export class RangeAreaSeries extends CartesianSeries<RangeAreaSeriesOptions & { yField: string }> {
  readonly type = 'range-area';
  private points: RangePoint[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  /** How the marker styler paints one edge of a datum, in the state it is in. */
  private markerStyle(
    index: number,
    datum: Datum,
    edge: 'high' | 'low',
    state: { highlighted: boolean; fill: ColorValue; stroke: ColorValue; size: Pixels; grow: number },
  ): MarkerItemStyle & { size: Pixels } {
    const params: RangeAreaItemStylerParams = {
      datum,
      index,
      highlighted: state.highlighted,
      fill: state.fill,
      stroke: state.stroke,
      size: state.size,
      edge,
      low: Number(datum[this.options.yLowField]),
      high: Number(datum[this.options.yHighField]),
    };
    return styleMarkerItem(this.options.marker?.itemStyler, params, state.grow);
  }

  /** Color of a datum for its tooltip: the high edge's marker at rest. */
  protected override itemColor(index: number, datum: Datum): ColorValue {
    const marker = this.options.marker;
    return (
      this.markerStyle(index, datum, 'high', {
        highlighted: false,
        fill: marker?.fill ?? this.mainColor(),
        stroke: marker?.stroke ?? this.env.theme.backgroundColor,
        size: marker?.size ?? DEFAULT_MARKER_SIZE,
        grow: 1,
      }).fill ?? this.mainColor()
    );
  }

  protected override get seriesName(): string {
    return this.options.name ?? `${this.options.yLowField}–${this.options.yHighField}`;
  }

  override yDomain(data: Datum[]): [number, number] | undefined {
    return extent([...numericValues(data, this.options.yLowField), ...numericValues(data, this.options.yHighField)]);
  }

  override axisKeys(): string[] {
    return [this.options.yLowField, this.options.yHighField];
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.points = [];
    if (!this.visible) return;
    const { data, xScale, yScale } = ctx;
    if (!(yScale instanceof LinearScale)) {
      throw new Error('grafit: range-area requires a numeric value axis');
    }
    const lows = numericValues(data, this.options.yLowField);
    const highs = numericValues(data, this.options.yHighField);
    data.forEach((datum, index) => {
      const low = lows[index];
      const high = highs[index];
      if (low === undefined || high === undefined || Number.isNaN(low) || Number.isNaN(high)) return;
      const x = CartesianSeries.positionOn(xScale, datum[this.options.xField]);
      if (Number.isNaN(x)) return;
      this.points.push({ index, x, yLow: yScale.convert(low), yHigh: yScale.convert(high) });
    });
    if (this.points.length === 0) return;

    const group = new Group();
    const fill = new Path();
    fill.fill = this.mainColor();
    fill.opacity = this.options.fillOpacity ?? this.env.theme.fillOpacity ?? 0.3;
    this.points.forEach((point, i) => {
      if (i === 0) fill.moveTo(point.x, point.yHigh);
      else fill.lineTo(point.x, point.yHigh);
    });
    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i];
      if (point) fill.lineTo(point.x, point.yLow);
    }
    fill.closePath();
    group.append(fill);

    for (const key of ['yHigh', 'yLow'] as const) {
      const line = new Path();
      line.stroke = this.options.stroke ?? this.mainColor();
      line.strokeWidth = this.options.strokeWidth ?? this.env.theme.markStrokeWidth ?? 1.5;
      this.points.forEach((point, i) => {
        if (i === 0) line.moveTo(point.x, point[key]);
        else line.lineTo(point.x, point[key]);
      });
      group.append(line);
    }

    const markerOptions = this.options.marker;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;
    const edges = [
      ['high', 'yHigh'],
      ['low', 'yLow'],
    ] as const;
    if (ctx.selected && ctx.selected.size > 0) {
      for (const point of this.points) {
        const datum = data[point.index];
        if (!ctx.selected.has(point.index) || !datum) continue;
        for (const [edge, key] of edges) {
          const stroke = ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
          // a selected marker is already as big as it gets, the pointer does not grow it further
          const item = this.markerStyle(point.index, datum, edge, {
            highlighted: point.index === highlighted,
            fill: this.mainColor(),
            stroke,
            size: (markerOptions?.size ?? DEFAULT_MARKER_SIZE) * (ctx.selectionStyle?.sizeRatio ?? 1.4),
            grow: 1,
          });
          const marker = new Marker();
          marker.x = point.x;
          marker.y = point[key];
          marker.size = item.size;
          marker.fill = item.fill ?? this.mainColor();
          marker.stroke = item.stroke ?? stroke;
          marker.strokeWidth = item.strokeWidth ?? ctx.selectionStyle?.strokeWidth ?? 2;
          group.append(marker);
        }
      }
    }
    const hoverOnly = markerOptions?.showOn === 'hover';
    if (markerOptions && (markerOptions.enabled === true || (hoverOnly && markerOptions.enabled !== false))) {
      for (const point of this.points) {
        const datum = data[point.index];
        if ((hoverOnly && point.index !== highlighted) || !datum) continue;
        for (const [edge, key] of edges) {
          const fill = markerOptions.fill ?? this.mainColor();
          const stroke = markerOptions.stroke ?? this.env.theme.backgroundColor;
          const item = this.markerStyle(point.index, datum, edge, {
            highlighted: point.index === highlighted,
            fill,
            stroke,
            size: markerOptions.size ?? DEFAULT_MARKER_SIZE,
            grow: 1.5,
          });
          const marker = new Marker();
          marker.x = point.x;
          marker.y = point[key];
          marker.shape = markerOptions.shape ?? 'circle';
          marker.size = item.size;
          marker.fill = item.fill ?? fill;
          marker.stroke = item.stroke ?? stroke;
          marker.strokeWidth = item.strokeWidth ?? markerOptions.strokeWidth ?? 1.5;
          group.append(marker);
        }
      }
    }

    if (ctx.highlight && ctx.highlight.seriesId !== this.id) group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    group.opacity *= ctx.animationT ?? 1;
    ctx.layer.append(group);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    let best: SeriesPick | undefined;
    for (const point of this.points) {
      for (const py of [point.yHigh, point.yLow]) {
        const distance = Math.hypot(point.x - x, py - y);
        if (distance <= PICK_RANGE && (best === undefined || distance < best.distance)) {
          best = { seriesId: this.id, datumIndex: point.index, distance, x: point.x, y: py };
        }
      }
    }
    return best;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const point = this.points.find((candidate) => candidate.index === datumIndex);
    if (!point) return undefined;
    return { seriesId: this.id, datumIndex, distance: 0, x: point.x, y: point.yHigh };
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    const color = this.itemColor(datumIndex, datum);
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

export const rangeAreaSeriesModule: SeriesModule<RangeAreaSeriesOptions> = {
  kind: 'series',
  type: 'range-area',
  requiredOptions: ['xField', 'yLowField', 'yHighField'],
  chartKind: 'cartesian',
  create: (options, env) => new RangeAreaSeries(options as RangeAreaSeriesOptions & { yField: string }, env),
};
