import type {
  LegendItemDescriptor,
  PolarRenderContext,
  PolarSeriesInstance,
  SeriesEnv,
  SeriesPick,
  TooltipContentData,
} from '@/shared/kernel';
import type { Datum, Showable } from '@/shared/options';

export interface PolarSeriesBaseOptions extends Showable {
  id?: string;
  showInLegend?: boolean;
}

/** Shared base for polar series. */
export abstract class PolarSeries<O extends PolarSeriesBaseOptions = PolarSeriesBaseOptions> implements PolarSeriesInstance {
  abstract readonly type: string;
  visible: boolean;
  protected lastCtx: PolarRenderContext | undefined;
  protected data: Datum[] = [];

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

  needsPolarAxes(): boolean {
    return true;
  }

  occupiesAngleSlot(): boolean {
    return false;
  }

  angleValues(_data: Datum[]): unknown[] {
    return [];
  }

  radiusDomain(_data: Datum[]): [number, number] | undefined {
    return undefined;
  }

  abstract update(ctx: PolarRenderContext): void;
  abstract pick(x: number, y: number): SeriesPick | undefined;
  abstract tooltipFor(datumIndex: number): TooltipContentData;
  abstract legendItems(): LegendItemDescriptor[];

  /** Polar coordinates → screen coordinates (angle 0 is up, clockwise). */
  protected static pointAt(centerX: number, centerY: number, angle: number, radius: number): { x: number; y: number } {
    return {
      x: centerX + Math.sin(angle) * radius,
      y: centerY - Math.cos(angle) * radius,
    };
  }
}
