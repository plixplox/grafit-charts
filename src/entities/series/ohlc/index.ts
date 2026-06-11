import { OhlcSeriesBase, type CandleGeometry, type OhlcSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';
import { Line, type SceneNode } from '@/shared/scene';

export interface OhlcSeriesOptions extends OhlcSeriesBaseOptions {
  type: 'ohlc';
}

export class OhlcSeries extends OhlcSeriesBase<OhlcSeriesOptions> {
  readonly type = 'ohlc';

  protected renderCandle(geometry: CandleGeometry, highlighted: boolean): SceneNode[] {
    const style = geometry.up ? this.upStyle() : this.downStyle();
    const strokeWidth = highlighted ? style.strokeWidth + 1 : style.strokeWidth;

    const stem = new Line();
    stem.x1 = stem.x2 = geometry.centerX;
    stem.y1 = geometry.high;
    stem.y2 = geometry.low;
    stem.stroke = style.stroke;
    stem.strokeWidth = strokeWidth;

    const openTick = new Line();
    openTick.x1 = geometry.bodyX;
    openTick.x2 = geometry.centerX;
    openTick.y1 = openTick.y2 = geometry.open;
    openTick.stroke = style.stroke;
    openTick.strokeWidth = strokeWidth;

    const closeTick = new Line();
    closeTick.x1 = geometry.centerX;
    closeTick.x2 = geometry.bodyX + geometry.bodyWidth;
    closeTick.y1 = closeTick.y2 = geometry.close;
    closeTick.stroke = style.stroke;
    closeTick.strokeWidth = strokeWidth;

    return [stem, openTick, closeTick];
  }
}

export const ohlcSeriesModule: SeriesModule<OhlcSeriesOptions> = {
  kind: 'series',
  type: 'ohlc',
  requiredOptions: ['xField', 'openField', 'highField', 'lowField', 'closeField'],
  chartKind: 'cartesian',
  create: (options, env) => new OhlcSeries(options as OhlcSeriesOptions & { yField: string }, env),
};
