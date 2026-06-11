import { MarkerSeries, type MarkerSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';

export interface ScatterSeriesOptions extends MarkerSeriesBaseOptions {
  type: 'scatter';
}

export class ScatterSeries extends MarkerSeries<ScatterSeriesOptions> {
  readonly type = 'scatter';
}

export const scatterSeriesModule: SeriesModule<ScatterSeriesOptions> = {
  kind: 'series',
  type: 'scatter',
  requiredOptions: ['xField', 'yField'],
  chartKind: 'cartesian',
  create: (options, env) => new ScatterSeries(options, env),
};
