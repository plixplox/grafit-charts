import { RadialSectorSeries, type RadialSectorSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';

export interface RadialColumnSeriesOptions extends RadialSectorSeriesBaseOptions {
  type: 'radial-column';
}

export class RadialColumnSeries extends RadialSectorSeries<RadialColumnSeriesOptions> {
  readonly type = 'radial-column';

  protected usesGroupSlot(): boolean {
    return true;
  }
}

export const radialColumnSeriesModule: SeriesModule<RadialColumnSeriesOptions> = {
  kind: 'series',
  type: 'radial-column',
  requiredOptions: ['angleField', 'radiusField'],
  chartKind: 'polar',
  create: (options, env) => new RadialColumnSeries(options, env),
};
