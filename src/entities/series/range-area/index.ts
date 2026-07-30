import { CartesianSeries, type SeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianRenderContext, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction } from '@/shared/options';
import { LinearScale } from '@/shared/scale';
import { Group, Marker, Path } from '@/shared/scene';
import { extent } from '@/shared/util';

export interface RangeAreaSeriesOptions extends Omit<SeriesBaseOptions, 'yField' | 'name'> {
  type: 'range-area';
  yLowField: string;
  yHighField: string;
  name?: string;
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
}

interface RangePoint {
  index: number;
  x: number;
  yLow: number;
  yHigh: number;
}

const PICK_RANGE = 30;
export class RangeAreaSeries extends CartesianSeries<RangeAreaSeriesOptions & { yField: string }> {
  readonly type = 'range-area';
  private points: RangePoint[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  protected override get seriesName(): string {
    return this.options.name ?? `${this.options.yLowField}–${this.options.yHighField}`;
  }

  override yDomain(data: Datum[]): [number, number] | undefined {
    return extent([...numericValues(data, this.options.yLowField), ...numericValues(data, this.options.yHighField)]);
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

    if (ctx.selected && ctx.selected.size > 0) {
      for (const point of this.points) {
        if (!ctx.selected.has(point.index)) continue;
        for (const py of [point.yHigh, point.yLow]) {
          const marker = new Marker();
          marker.x = point.x;
          marker.y = py;
          marker.size = 7 * (ctx.selectionStyle?.sizeRatio ?? 1.4);
          marker.fill = this.mainColor();
          marker.stroke = ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
          marker.strokeWidth = ctx.selectionStyle?.strokeWidth ?? 2;
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

export const rangeAreaSeriesModule: SeriesModule<RangeAreaSeriesOptions> = {
  kind: 'series',
  type: 'range-area',
  requiredOptions: ['xField', 'yLowField', 'yHighField'],
  chartKind: 'cartesian',
  create: (options, env) => new RangeAreaSeries(options as RangeAreaSeriesOptions & { yField: string }, env),
};
