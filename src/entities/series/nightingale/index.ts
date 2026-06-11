import { RadialSectorSeries, type RadialSectorSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';

export interface NightingaleSeriesOptions extends RadialSectorSeriesBaseOptions {
  type: 'nightingale';
}

export class NightingaleSeries extends RadialSectorSeries<NightingaleSeriesOptions> {
  readonly type = 'nightingale';

  protected usesGroupSlot(): boolean {
    return false;
  }
}

export const nightingaleSeriesModule: SeriesModule<NightingaleSeriesOptions> = {
  kind: 'series',
  type: 'nightingale',
  requiredOptions: ['angleField', 'radiusField'],
  chartKind: 'polar',
  create: (options, env) => new NightingaleSeries(options, env),
};
