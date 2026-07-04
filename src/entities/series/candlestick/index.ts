import { OhlcSeriesBase, type CandleGeometry, type OhlcSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';
import { Line, Rect, type SceneNode } from '@/shared/scene';

export interface CandlestickSeriesOptions extends OhlcSeriesBaseOptions {
  type: 'candlestick';
}

export class CandlestickSeries extends OhlcSeriesBase<CandlestickSeriesOptions> {
  readonly type = 'candlestick';

  protected renderCandle(geometry: CandleGeometry, _highlighted: boolean, selected: boolean): SceneNode[] {
    const style = geometry.up ? this.upStyle() : this.downStyle();
    const wick = new Line();
    wick.x1 = wick.x2 = geometry.centerX;
    wick.y1 = geometry.high;
    wick.y2 = geometry.low;
    wick.stroke = style.stroke;
    wick.strokeWidth = 1;

    const body = new Rect();
    body.x = geometry.bodyX;
    body.y = Math.min(geometry.open, geometry.close);
    body.width = geometry.bodyWidth;
    body.height = Math.max(1, Math.abs(geometry.close - geometry.open));
    body.fill = style.fill;
    body.cornerRadius = 1;
    if (selected) {
      body.stroke = this.lastCtx?.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
      body.strokeWidth = this.lastCtx?.selectionStyle?.strokeWidth ?? 1.5;
    }
    return [wick, body];
  }
}

export const candlestickSeriesModule: SeriesModule<CandlestickSeriesOptions> = {
  kind: 'series',
  type: 'candlestick',
  requiredOptions: ['xField', 'openField', 'highField', 'lowField', 'closeField'],
  chartKind: 'cartesian',
  create: (options, env) => new CandlestickSeries(options as CandlestickSeriesOptions & { yField: string }, env),
};
