import {
  CartesianSeries,
  labelFont,
  placeRectLabel,
  rectLabelOverflow,
  type RectLabelPlacement,
  type SeriesBaseOptions,
} from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import type {
  CartesianGeometry,
  CartesianRenderContext,
  Insets,
  LabelOverflowContext,
  SeriesModule,
  SeriesPick,
  TooltipContentData,
} from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, FontOptions, LabelOverlapOptions, Switchable } from '@/shared/options';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Line, Rect, Text } from '@/shared/scene';
import { contrastTextColor, NO_OVERFLOW } from '@/shared/util';

export interface WaterfallSeriesOptions extends SeriesBaseOptions {
  type: 'waterfall';
  item?: {
    positive?: { fill?: ColorValue };
    negative?: { fill?: ColorValue };
    total?: { fill?: ColorValue };
  };
  /** Data indices that are subtotals (bar drawn from zero). */
  totals?: number[];
  cornerRadius?: Pixels;
  /** Connector lines between bars. */
  line?: { enabled?: boolean; stroke?: ColorValue };
  /** Value labels: same placements as bar (top, inner-top, center, …). */
  label?: Switchable &
    FontOptions &
    LabelOverlapOptions & {
      placement?: RectLabelPlacement;
      formatter?: (params: { value: number; isTotal: boolean; datum: Datum }) => string;
    };
}

interface BarGeometry {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  start: number;
  end: number;
  isTotal: boolean;
}

export class WaterfallSeries extends CartesianSeries<WaterfallSeriesOptions> {
  readonly type = 'waterfall';
  private bars: BarGeometry[] = [];

  protected mainColor(): ColorValue {
    return this.options.item?.positive?.fill ?? this.env.colors.fill;
  }

  override occupiesBandSlot(): boolean {
    return true;
  }

  /** Cumulative start/end for each bar. */
  private cumulative(data: Datum[]): Array<{ start: number; end: number; isTotal: boolean }> {
    const values = numericValues(data, this.options.yField);
    const totals = new Set(this.options.totals ?? []);
    let cursor = 0;
    return values.map((value, index) => {
      if (totals.has(index)) {
        return { start: 0, end: cursor, isTotal: true };
      }
      const safe = Number.isNaN(value) ? 0 : value;
      const start = cursor;
      cursor += safe;
      return { start, end: cursor, isTotal: false };
    });
  }

  override yDomain(data: Datum[]): [number, number] | undefined {
    const steps = this.cumulative(data);
    if (steps.length === 0) return undefined;
    let min = 0;
    let max = 0;
    for (const step of steps) {
      min = Math.min(min, step.start, step.end);
      max = Math.max(max, step.start, step.end);
    }
    return [min, max];
  }

  /** Bars in plot coordinates; shared by rendering and label measurement (t = 1 there). */
  private layoutBars(ctx: CartesianGeometry, t: number): BarGeometry[] {
    const bandScale = ctx.xScale;
    const valueScale = ctx.yScale;
    if (!(bandScale instanceof BandScale) || !(valueScale instanceof LinearScale)) {
      throw new Error('grafit: waterfall requires a category X axis and a numeric Y axis');
    }
    const steps = this.cumulative(ctx.data);
    const bars: BarGeometry[] = [];
    ctx.data.forEach((datum, index) => {
      const step = steps[index];
      if (!step) return;
      const bandStart = bandScale.convert(datum[this.options.xField]);
      if (Number.isNaN(bandStart)) return;
      const mid = (step.start + step.end) / 2;
      const p0 = valueScale.convert(mid + (step.start - mid) * Math.max(t, 0.001));
      const p1 = valueScale.convert(mid + (step.end - mid) * Math.max(t, 0.001));
      bars.push({
        index,
        x: bandStart,
        y: Math.min(p0, p1),
        width: bandScale.bandwidth,
        height: Math.max(1, Math.abs(p1 - p0)),
        start: step.start,
        end: step.end,
        isTotal: step.isTotal,
      });
    });
    return bars;
  }

  /** Label text of a bar: the step delta, or the running total for a subtotal. */
  private labelTextFor(bar: BarGeometry, data: Datum[]): string {
    const value = bar.isTotal ? bar.end : bar.end - bar.start;
    const datum = data[bar.index];
    const formatter = this.options.label?.formatter;
    return formatter && datum ? formatter({ value, isTotal: bar.isTotal, datum }) : String(Math.round(value * 100) / 100);
  }

  override labelOverflow(ctx: LabelOverflowContext): Insets {
    if (!this.visible || this.options.label?.enabled !== true) return NO_OVERFLOW;
    const marks = this.layoutBars(ctx, 1).map((bar) => ({ rect: bar, text: this.labelTextFor(bar, ctx.data) }));
    return rectLabelOverflow(
      marks,
      this.options.label.placement ?? 'top',
      labelFont(this.options.label, this.env.theme),
      ctx.plot,
      ctx.measureText,
    );
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.bars = [];
    if (!this.visible) return;
    const positiveFill = this.options.item?.positive?.fill ?? this.env.colors.fill;
    const negativeFill = this.options.item?.negative?.fill ?? this.env.theme.negativeColor;
    const totalFill = this.options.item?.total?.fill ?? this.env.theme.mutedColor;
    const group = new Group();
    const labels = new Group();

    this.bars = this.layoutBars(ctx, ctx.animationT ?? 1);
    // the scales were checked while laying the bars out
    const valueScale = ctx.yScale as LinearScale;
    let prev: BarGeometry | undefined;
    this.bars.forEach((bar) => {
      const index = bar.index;

      if (this.options.line?.enabled !== false && prev) {
        const connector = new Line();
        connector.x1 = prev.x + prev.width;
        connector.y1 = valueScale.convert(prev.end);
        connector.x2 = bar.x;
        connector.y2 = valueScale.convert(bar.isTotal ? bar.end : bar.start);
        connector.stroke = this.options.line?.stroke ?? this.env.theme.mutedColor;
        connector.lineDash = [3, 3];
        group.append(connector);
      }

      const node = new Rect();
      node.x = bar.x;
      node.y = bar.y;
      node.width = bar.width;
      node.height = bar.height;
      node.fill = bar.isTotal ? totalFill : bar.end >= bar.start ? positiveFill : negativeFill;
      node.cornerRadius = this.options.cornerRadius ?? this.env.theme.cornerRadius ?? 2;
      if (ctx.selected?.has(index)) {
        node.stroke = ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
        node.strokeWidth = ctx.selectionStyle?.strokeWidth ?? 1.5;
      }
      if (ctx.selectionActive && !ctx.selected?.has(index)) {
        node.opacity *= ctx.selectionStyle?.inactiveOpacity ?? 0.45;
      }
      group.append(node);

      if (this.options.label?.enabled === true) {
        const labelOptions = this.options.label;
        const placed = placeRectLabel(labelOptions.placement ?? 'top', bar);
        const font = labelFont(labelOptions, this.env.theme);
        const text = new Text();
        text.text = this.labelTextFor(bar, ctx.data);
        text.x = placed.x;
        text.y = placed.y;
        text.textAlign = placed.align;
        text.textBaseline = placed.baseline;
        text.fontSize = font.size;
        text.fontWeight = font.weight;
        text.fontFamily = font.family;
        const elementFill = node.fill ?? this.env.colors.fill;
        text.fill = labelOptions.color ?? (placed.inside ? contrastTextColor(elementFill) : this.env.theme.foregroundColor);
        if (placed.inside) text.outline = elementFill;
        if (this.labelFits(ctx, text, labelOptions.avoidOverlap)) labels.append(text);
      }
      prev = bar;
    });
    this.appendGroups(ctx, group, labels);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const bar of this.bars) {
      if (x >= bar.x && x <= bar.x + bar.width && y >= bar.y && y <= bar.y + bar.height) {
        return { seriesId: this.id, datumIndex: bar.index, distance: 0, x: bar.x + bar.width / 2, y: bar.y };
      }
    }
    return undefined;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const bar = this.bars.find((candidate) => candidate.index === datumIndex);
    if (!bar) return undefined;
    return { seriesId: this.id, datumIndex, distance: 0, x: bar.x + bar.width / 2, y: bar.y };
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    const bar = this.bars.find((candidate) => candidate.index === datumIndex);
    if (!datum || !bar) return { rows: [] };
    const delta = bar.end - bar.start;
    const color = bar.isTotal
      ? (this.options.item?.total?.fill ?? this.env.theme.mutedColor)
      : delta >= 0
        ? (this.options.item?.positive?.fill ?? this.env.colors.fill)
        : (this.options.item?.negative?.fill ?? this.env.theme.negativeColor);
    return {
      heading: String(datum[this.options.xField]),
      rows: bar.isTotal
        ? [{ label: 'Total', value: String(bar.end), color }]
        : [
            { label: this.options.name ?? this.options.yField, value: `${delta >= 0 ? '+' : ''}${delta}`, color },
            { label: 'Cumulative', value: String(bar.end) },
          ],
    };
  }
}

export const waterfallSeriesModule: SeriesModule<WaterfallSeriesOptions> = {
  kind: 'series',
  type: 'waterfall',
  requiredOptions: ['xField', 'yField'],
  chartKind: 'cartesian',
  create: (options, env) => new WaterfallSeries(options, env),
};
