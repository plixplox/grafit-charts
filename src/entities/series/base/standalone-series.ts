import type {
  LegendItemDescriptor,
  SeriesEnv,
  SeriesPick,
  StandaloneRenderContext,
  StandaloneSeriesInstance,
  TooltipContentData,
} from '@/shared/kernel';
import type { ColorValue, Datum, Showable } from '@/shared/options';

export interface StandaloneSeriesBaseOptions extends Showable {
  id?: string;
  showInLegend?: boolean;
  fills?: ColorValue[];
}

interface HitRect {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

/** Base for axis-less series: shared rectangle-based hit testing. */
export abstract class StandaloneSeries<
  O extends StandaloneSeriesBaseOptions = StandaloneSeriesBaseOptions,
> implements StandaloneSeriesInstance {
  abstract readonly type: string;
  visible: boolean;
  protected data: Datum[] = [];
  protected lastCtx: StandaloneRenderContext | undefined;
  protected hits: HitRect[] = [];

  constructor(
    readonly options: O,
    protected readonly env: SeriesEnv,
  ) {
    this.visible = options.visible !== false;
  }

  get id(): string {
    return this.options.id ?? this.env.id;
  }

  setData(data: Datum[]): void {
    this.data = data;
  }

  protected colorFor(index: number): ColorValue {
    const fills = this.options.fills ?? this.env.theme.palette.fills;
    return fills[index % fills.length] ?? this.env.colors.fill;
  }

  protected registerHit(index: number, x: number, y: number, width: number, height: number): void {
    this.hits.push({ index, x, y, width, height, anchorX: x + width / 2, anchorY: y });
  }

  abstract update(ctx: StandaloneRenderContext): void;
  abstract tooltipFor(datumIndex: number): TooltipContentData;

  pick(x: number, y: number): SeriesPick | undefined {
    // reverse order: nested elements are drawn later and take priority
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const hit = this.hits[i];
      if (!hit) continue;
      if (x >= hit.x && x <= hit.x + hit.width && y >= hit.y && y <= hit.y + hit.height) {
        return { seriesId: this.id, datumIndex: hit.index, distance: 0, x: hit.anchorX, y: hit.anchorY };
      }
    }
    return undefined;
  }

  legendItems(): LegendItemDescriptor[] {
    return [];
  }
}
