import { RadarSeries, type RadarSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';

export interface RadarAreaSeriesOptions extends RadarSeriesBaseOptions {
  type: 'radar-area';
}

export class RadarAreaSeries extends RadarSeries<RadarAreaSeriesOptions> {
  readonly type = 'radar-area';

  protected filled(): boolean {
    return true;
  }
}

export const radarAreaSeriesModule: SeriesModule<RadarAreaSeriesOptions> = {
  kind: 'series',
  type: 'radar-area',
  requiredOptions: ['angleField', 'radiusField'],
  chartKind: 'polar',
  create: (options, env) => new RadarAreaSeries(options, env),
};
