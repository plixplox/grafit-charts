import { CartesianSeries } from './cartesian-series';
import { numericValues } from '@/shared/data';
import type { CartesianRenderContext, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Showable } from '@/shared/options';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, type SceneNode } from '@/shared/scene';
import { extent } from '@/shared/util';

export interface OhlcItemStyle {
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
}

export interface OhlcSeriesBaseOptions extends Showable {
  id?: string;
  xField: string;
  openField: string;
  highField: string;
  lowField: string;
  closeField: string;
  name?: string;
  showInLegend?: boolean;
  item?: {
    up?: OhlcItemStyle;
    down?: OhlcItemStyle;
  };
}

export interface CandleGeometry {
  index: number;
  centerX: number;
  bodyX: number;
  bodyWidth: number;
  open: number;
  close: number;
  high: number;
  low: number;
  up: boolean;
}

export const UP_COLOR = '#21a06c';
export const DOWN_COLOR = '#e5484d';

/** Base for candlestick/ohlc: candle geometry over category axis bands. */
export abstract class OhlcSeriesBase<O extends OhlcSeriesBaseOptions> extends CartesianSeries<O & { yField: string }> {
  protected candles: CandleGeometry[] = [];

  protected abstract renderCandle(geometry: CandleGeometry, highlighted: boolean, selected: boolean): SceneNode[];

  protected mainColor(): ColorValue {
    return this.options.item?.up?.fill ?? UP_COLOR;
  }

  protected override get seriesName(): string {
    return this.options.name ?? 'OHLC';
  }

  preferredXAxisType(): 'category' {
    // default without axes: category (ordinal-time recommended)
    return 'category';
  }

  protected upStyle(): Required<OhlcItemStyle> {
    const up = this.options.item?.up;
    return { fill: up?.fill ?? UP_COLOR, stroke: up?.stroke ?? up?.fill ?? UP_COLOR, strokeWidth: up?.strokeWidth ?? 1.4 };
  }

  protected downStyle(): Required<OhlcItemStyle> {
    const down = this.options.item?.down;
    return {
      fill: down?.fill ?? DOWN_COLOR,
      stroke: down?.stroke ?? down?.fill ?? DOWN_COLOR,
      strokeWidth: down?.strokeWidth ?? 1.4,
    };
  }

  override yDomain(data: Datum[]): [number, number] | undefined {
    return extent([...numericValues(data, this.options.lowField), ...numericValues(data, this.options.highField)]);
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.candles = [];
    if (!this.visible) return;
    const bandScale = ctx.xScale;
    const valueScale = ctx.yScale;
    if (!(bandScale instanceof BandScale) || !(valueScale instanceof LinearScale)) {
      throw new Error('grafit: candlestick/ohlc requires a category X axis (ordinal-time) and a numeric Y axis');
    }
    const opens = numericValues(ctx.data, this.options.openField);
    const highs = numericValues(ctx.data, this.options.highField);
    const lows = numericValues(ctx.data, this.options.lowField);
    const closes = numericValues(ctx.data, this.options.closeField);
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;
    const group = new Group();

    ctx.data.forEach((datum, index) => {
      const open = opens[index];
      const high = highs[index];
      const low = lows[index];
      const close = closes[index];
      if ([open, high, low, close].some((value) => value === undefined || Number.isNaN(value))) return;
      const bandStart = bandScale.convert(datum[this.options.xField]);
      if (Number.isNaN(bandStart)) return;
      const geometry: CandleGeometry = {
        index,
        centerX: bandStart + bandScale.bandwidth / 2,
        bodyX: bandStart,
        bodyWidth: bandScale.bandwidth,
        open: valueScale.convert(open!),
        close: valueScale.convert(close!),
        high: valueScale.convert(high!),
        low: valueScale.convert(low!),
        up: close! >= open!,
      };
      this.candles.push(geometry);
      const isSelected = ctx.selected?.has(index) === true;
      for (const node of this.renderCandle(geometry, index === highlighted, isSelected)) {
        if (ctx.selectionActive && !isSelected) node.opacity *= ctx.selectionStyle?.inactiveOpacity ?? 0.45;
        group.append(node);
      }
    });
    group.opacity = ctx.animationT ?? 1;
    ctx.layer.append(group);
  }

  pick(x: number, y: number, searchRadius?: number): SeriesPick | undefined {
    for (const candle of this.candles) {
      const top = Math.min(candle.high, candle.low);
      const bottom = Math.max(candle.high, candle.low);
      if (searchRadius === Infinity && x >= candle.bodyX && x <= candle.bodyX + candle.bodyWidth) {
        return {
          seriesId: this.id,
          datumIndex: candle.index,
          distance: 0,
          x: candle.centerX,
          y: Math.min(candle.open, candle.close),
        };
      }
      if (x >= candle.bodyX && x <= candle.bodyX + candle.bodyWidth && y >= top - 4 && y <= bottom + 4) {
        return {
          seriesId: this.id,
          datumIndex: candle.index,
          distance: 0,
          x: candle.centerX,
          y: Math.min(candle.open, candle.close),
        };
      }
    }
    return undefined;
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    const candle = this.candles.find((c) => c.index === datumIndex);
    if (!datum) return { rows: [] };
    const color = candle?.up ? this.upStyle().fill : this.downStyle().fill;
    const heading = this.formatHeading(datum[this.options.xField]);
    return {
      heading,
      rows: [
        { label: 'O', value: String(datum[this.options.openField]), color },
        { label: 'H', value: String(datum[this.options.highField]), color },
        { label: 'L', value: String(datum[this.options.lowField]), color },
        { label: 'C', value: String(datum[this.options.closeField]), color },
      ],
    };
  }

  private formatHeading(value: unknown): string {
    if (value instanceof Date) {
      return value.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(value);
  }
}
