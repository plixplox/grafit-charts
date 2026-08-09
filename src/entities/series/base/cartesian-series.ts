import { numericValues } from '@/shared/data';
import type {
  CartesianRenderContext,
  CartesianSeriesInstance,
  Insets,
  LabelOverflowContext,
  LegendItemDescriptor,
  SeriesEnv,
  SeriesPick,
  StackSegment,
  TooltipContentData,
} from '@/shared/kernel';
import type { ColorValue, Datum, Switchable, Showable } from '@/shared/options';
import { BandScale, TimeScale, toTimestamp, type AnyScale } from '@/shared/scale';
import type { Group, Text } from '@/shared/scene';
import { extent, NO_OVERFLOW } from '@/shared/util';

export interface SeriesTooltipRendererParams {
  datum: Datum;
  xField: string;
  yField: string;
  xValue: unknown;
  yValue: unknown;
  seriesName: string;
  color: ColorValue;
}

export interface SeriesBaseOptions extends Showable {
  id?: string;
  xField: string;
  xName?: string;
  yField: string;
  name?: string;
  showInLegend?: boolean;
  tooltip?: Switchable & {
    renderer?: (params: SeriesTooltipRendererParams) => string | TooltipContentData;
  };
}

export abstract class CartesianSeries<O extends SeriesBaseOptions = SeriesBaseOptions> implements CartesianSeriesInstance {
  abstract readonly type: string;
  visible: boolean;

  constructor(
    readonly options: O,
    protected readonly env: SeriesEnv,
  ) {
    this.visible = options.visible !== false;
  }

  get id(): string {
    return this.options.id ?? this.env.id;
  }

  protected get seriesName(): string {
    return this.options.name ?? this.options.yField;
  }

  /** Main series color — for the legend and tooltip. */
  protected abstract mainColor(): ColorValue;

  xValues(data: Datum[]): unknown[] {
    return data.map((datum) => datum[this.options.xField]);
  }

  /**
   * The single value field of the series; the multi-field ones (range, OHLC,
   * box plot) list all of theirs instead.
   */
  axisKeys(): string[] {
    return this.options.yField ? [this.options.yField] : [];
  }

  yDomain(data: Datum[], stack?: StackSegment): [number, number] | undefined {
    if (stack) return extent([...stack.y0, ...stack.y1]);
    return extent(numericValues(data, this.options.yField));
  }

  stackParticipation(): { key: string; stackGroup: string; normalizedTo?: number } | undefined {
    return undefined;
  }

  occupiesBandSlot(): boolean {
    return false;
  }

  abstract update(ctx: CartesianRenderContext): void;
  abstract pick(x: number, y: number): SeriesPick | undefined;

  /** Everything a series draws stays inside the plot rect until it says otherwise. */
  labelOverflow(_ctx: LabelOverflowContext): Insets {
    return NO_OVERFLOW;
  }

  tooltipFor(datumIndex: number): TooltipContentData {
    const ctx = this.lastCtx;
    const datum = ctx?.data[datumIndex];
    if (!datum) return { rows: [] };
    const xValue = datum[this.options.xField];
    const yValue = datum[this.options.yField];
    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      const result = renderer({
        datum,
        xField: this.options.xField,
        yField: this.options.yField,
        xValue,
        yValue,
        seriesName: this.seriesName,
        color: this.mainColor(),
      });
      return typeof result === 'string' ? { heading: result, rows: [] } : result;
    }
    return {
      heading: String(xValue),
      rows: [{ label: this.seriesName, value: String(yValue), color: this.mainColor() }],
    };
  }

  legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    return [{ seriesId: this.id, label: this.seriesName, color: this.mainColor(), visible: this.visible }];
  }

  protected lastCtx: CartesianRenderContext | undefined;

  /**
   * Whether a label gets to stay: with label.avoidOverlap on, the ones whose
   * box is already taken by a label drawn earlier are left out. The text node
   * carries its own anchor and font, so it describes its box itself.
   */
  protected labelFits(ctx: CartesianRenderContext, label: Text, avoidOverlap: boolean | undefined): boolean {
    if (avoidOverlap !== true || !ctx.labelGuard) return true;
    return ctx.labelGuard.admits({
      text: label.text,
      x: label.x,
      y: label.y,
      align: label.textAlign,
      baseline: label.textBaseline,
      fontSize: label.fontSize,
      font: `${label.fontWeight} ${label.fontSize}px ${label.fontFamily}`,
    });
  }

  /**
   * Marks go into the series layer, value labels into the layer above it —
   * text stays readable whatever a later series or a neighbouring mark draws
   * over its place. The labels inherit the dimming of their marks.
   */
  protected appendGroups(ctx: CartesianRenderContext, marks: Group, labels: Group): void {
    labels.opacity = marks.opacity;
    ctx.layer.append(marks);
    (ctx.labelLayer ?? ctx.layer).append(labels);
  }

  /** Category coordinate (band center), time-based or numeric position. */
  protected static positionOn(scale: AnyScale, value: unknown): number {
    if (scale instanceof BandScale) return scale.center(value);
    if (scale instanceof TimeScale) return scale.convert(toTimestamp(value));
    return scale.convert(Number(value));
  }
}
