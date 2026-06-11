import { RadarSeries, type RadarSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';

export interface RadarLineSeriesOptions extends RadarSeriesBaseOptions {
  type: 'radar-line';
}

export class RadarLineSeries extends RadarSeries<RadarLineSeriesOptions> {
  readonly type = 'radar-line';

  protected filled(): boolean {
    return false;
  }
}

export const radarLineSeriesModule: SeriesModule<RadarLineSeriesOptions> = {
  kind: 'series',
  type: 'radar-line',
  requiredOptions: ['angleField', 'radiusField'],
  chartKind: 'polar',
  create: (options, env) => new RadarLineSeries(options, env),
};
