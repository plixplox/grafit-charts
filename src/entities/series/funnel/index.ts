import { FunnelSeriesBase, type FunnelSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';

export interface FunnelSeriesOptions extends FunnelSeriesBaseOptions {
  type: 'funnel';
}

export class FunnelSeries extends FunnelSeriesBase<FunnelSeriesOptions> {
  readonly type = 'funnel';

  protected trapezoid(): boolean {
    return false;
  }
}

export const funnelSeriesModule: SeriesModule<FunnelSeriesOptions> = {
  kind: 'series',
  type: 'funnel',
  requiredOptions: ['stageField', 'valueField'],
  chartKind: 'cartesian',
  create: (options, env) => new FunnelSeries(options as FunnelSeriesOptions & { xField: string; yField: string }, env),
};
