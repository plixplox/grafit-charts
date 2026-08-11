import type {
  LegendItemDescriptor,
  PolarRenderContext,
  PolarSeriesInstance,
  SeriesEnv,
  SeriesPick,
  TooltipContentData,
} from '@/shared/kernel';
import type { ColorValue, Datum, Showable } from '@/shared/options';

export interface PolarSeriesBaseOptions extends Showable {
  id?: string;
  showInLegend?: boolean;
}

/**
 * What the tooltip of a radial mark is handed: the category it sits on and the
 * value that gave it its radius.
 */
export interface RadialTooltipRendererParams {
  datum: Datum;
  /** Category along the angle (angleField). */
  label: string;
  /** Value of radiusField. */
  value: unknown;
  seriesName: string;
  color: ColorValue;
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

  /**
   * Marks inside a rubber band. A polar mark is a wedge or a point rather than
   * a box, so it is caught by the spot the chart already uses to address it —
   * the anchor `nodeAt` returns. A series without one catches nothing.
   */
  pickInRect(x0: number, y0: number, x1: number, y1: number): number[] {
    const anchorOf = (this as { nodeAt?: (index: number) => SeriesPick | undefined }).nodeAt;
    if (!anchorOf) return [];
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const inside: number[] = [];
    this.data.forEach((_, index) => {
      const anchor = anchorOf.call(this, index);
      if (!anchor) return;
      if (anchor.x >= minX && anchor.x <= maxX && anchor.y >= minY && anchor.y <= maxY) inside.push(index);
    });
    return inside;
  }
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
