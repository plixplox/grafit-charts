import { FunnelSeriesBase, type FunnelSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule } from '@/shared/kernel';

export interface ConeFunnelSeriesOptions extends FunnelSeriesBaseOptions {
  type: 'cone-funnel';
}

export class ConeFunnelSeries extends FunnelSeriesBase<ConeFunnelSeriesOptions> {
  readonly type = 'cone-funnel';

  protected trapezoid(): boolean {
    return true;
  }
}

export const coneFunnelSeriesModule: SeriesModule<ConeFunnelSeriesOptions> = {
  kind: 'series',
  type: 'cone-funnel',
  requiredOptions: ['stageField', 'valueField'],
  chartKind: 'cartesian',
  create: (options, env) => new ConeFunnelSeries(options as ConeFunnelSeriesOptions & { xField: string; yField: string }, env),
};
