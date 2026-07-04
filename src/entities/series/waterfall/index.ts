import { CartesianSeries, placeRectLabel, type RectLabelPlacement, type SeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import type { CartesianRenderContext, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, FontOptions, Switchable } from '@/shared/options';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Line, Rect, Text } from '@/shared/scene';
import { contrastTextColor } from '@/shared/util';

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
    FontOptions & {
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

const NEGATIVE_FALLBACK = '#e5484d';

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

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.bars = [];
    if (!this.visible) return;
    const bandScale = ctx.xScale;
    const valueScale = ctx.yScale;
    if (!(bandScale instanceof BandScale) || !(valueScale instanceof LinearScale)) {
      throw new Error('grafit: waterfall requires a category X axis and a numeric Y axis');
    }
    const steps = this.cumulative(ctx.data);
    const t = ctx.animationT ?? 1;
    const positiveFill = this.options.item?.positive?.fill ?? this.env.colors.fill;
    const negativeFill = this.options.item?.negative?.fill ?? NEGATIVE_FALLBACK;
    const totalFill = this.options.item?.total?.fill ?? this.env.theme.mutedColor;
    const group = new Group();

    let prev: BarGeometry | undefined;
    ctx.data.forEach((datum, index) => {
      const step = steps[index];
      if (!step) return;
      const bandStart = bandScale.convert(datum[this.options.xField]);
      if (Number.isNaN(bandStart)) return;
      const width = bandScale.bandwidth;
      const mid = (step.start + step.end) / 2;
      const p0 = valueScale.convert(mid + (step.start - mid) * Math.max(t, 0.001));
      const p1 = valueScale.convert(mid + (step.end - mid) * Math.max(t, 0.001));
      const bar: BarGeometry = {
        index,
        x: bandStart,
        y: Math.min(p0, p1),
        width,
        height: Math.max(1, Math.abs(p1 - p0)),
        start: step.start,
        end: step.end,
        isTotal: step.isTotal,
      };
      this.bars.push(bar);

      if (this.options.line?.enabled !== false && prev) {
        const connector = new Line();
        connector.x1 = prev.x + prev.width;
        connector.y1 = valueScale.convert(prev.end);
        connector.x2 = bar.x;
        connector.y2 = valueScale.convert(step.isTotal ? step.end : step.start);
        connector.stroke = this.options.line?.stroke ?? this.env.theme.mutedColor;
        connector.lineDash = [3, 3];
        group.append(connector);
      }

      const node = new Rect();
      node.x = bar.x;
      node.y = bar.y;
      node.width = bar.width;
      node.height = bar.height;
      node.fill = step.isTotal ? totalFill : step.end >= step.start ? positiveFill : negativeFill;
      node.cornerRadius = this.options.cornerRadius ?? 2;
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
        const rect = { x: bar.x, y: bar.y, width: bar.width, height: bar.height };
        const placed = placeRectLabel(labelOptions.placement ?? 'top', rect);
        const labelValue = step.isTotal ? step.end : step.end - step.start;
        const text = new Text();
        text.text = labelOptions.formatter
          ? labelOptions.formatter({ value: labelValue, isTotal: step.isTotal, datum })
          : String(Math.round(labelValue * 100) / 100);
        text.x = placed.x;
        text.y = placed.y;
        text.textAlign = placed.align;
        text.textBaseline = placed.baseline;
        text.fontSize = labelOptions.fontSize ?? 11;
        text.fontWeight = labelOptions.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
        text.fontFamily = labelOptions.fontFamily ?? this.env.theme.fontFamily;
        const elementFill = node.fill ?? this.env.colors.fill;
        text.fill = labelOptions.color ?? (placed.inside ? contrastTextColor(elementFill) : this.env.theme.foregroundColor);
        if (placed.inside) text.outline = elementFill;
        group.append(text);
      }
      prev = bar;
    });
    ctx.layer.append(group);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const bar of this.bars) {
      if (x >= bar.x && x <= bar.x + bar.width && y >= bar.y && y <= bar.y + bar.height) {
        return { seriesId: this.id, datumIndex: bar.index, distance: 0, x: bar.x + bar.width / 2, y: bar.y };
      }
    }
    return undefined;
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
        : (this.options.item?.negative?.fill ?? NEGATIVE_FALLBACK);
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
