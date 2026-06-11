import { PieLikeSeries, type PieLikeSeriesOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';

export interface PieSeriesOptions extends PieLikeSeriesOptions {
  type: 'pie';
}

export class PieSeries extends PieLikeSeries<PieSeriesOptions> {
  readonly type = 'pie';

  protected innerRadiusRatio(): number {
    return 0;
  }
}

export const pieSeriesModule: SeriesModule<PieSeriesOptions> = {
  kind: 'series',
  type: 'pie',
  requiredOptions: ['angleField'],
  chartKind: 'polar',
  create: (options, env) => new PieSeries(options, env),
};
