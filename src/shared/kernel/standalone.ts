/** Contracts of axis-less series (hierarchy: treemap/sunburst/pyramid; flow: sankey/chord). */
import type { HighlightState, LayoutRect, LegendItemDescriptor, SeriesPick, TooltipContentData } from './cartesian';
import type { Datum } from '@/shared/options';
import type { Group } from '@/shared/scene';

export interface StandaloneRenderContext {
  data: Datum[];
  plot: LayoutRect;
  layer: Group;
  highlight?: HighlightState;
  animationT?: number;
}

export interface StandaloneSeriesInstance {
  readonly id: string;
  readonly type: string;
  visible: boolean;
  setData(data: Datum[]): void;
  update(ctx: StandaloneRenderContext): void;
  pick(x: number, y: number): SeriesPick | undefined;
  tooltipFor(datumIndex: number): TooltipContentData;
  legendItems(): LegendItemDescriptor[];
}
