import { CartesianSeries, placeRectLabel, type RectLabelPlacement, type SeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianRenderContext, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, FontOptions, Switchable } from '@/shared/options';
import { LinearScale } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';
import { extent, contrastTextColor } from '@/shared/util';

export interface HistogramSeriesOptions extends Omit<SeriesBaseOptions, 'yField' | 'name'> {
  type: 'histogram';
  /** Numeric field used to build the bins. */
  xField: string;
  /** Aggregation field; without it the count is used. */
  yField?: string;
  name?: string;
  aggregation?: 'count' | 'sum' | 'mean';
  binCount?: number;
  /** Explicit bin edges: [[min,max], ...]. */
  bins?: Array<[number, number]>;
  /** Value labels: same placements as bar (top, inner-top, center, …). */
  label?: Switchable &
    FontOptions & {
      placement?: RectLabelPlacement;
      formatter?: (params: { value: number; x0: number; x1: number }) => string;
    };
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
}

interface HistogramBin {
  x0: number;
  x1: number;
  value: number;
  count: number;
}

interface BinRect {
  binIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class HistogramSeries extends CartesianSeries<HistogramSeriesOptions & { yField: string }> {
  readonly type = 'histogram';
  private bins: HistogramBin[] = [];
  private rects: BinRect[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  preferredXAxisType(): 'number' {
    return 'number';
  }

  protected override get seriesName(): string {
    return this.options.name ?? (this.options.aggregation === 'mean' ? 'Mean' : (this.options.yField ?? 'Count'));
  }

  private computeBins(data: Datum[]): HistogramBin[] {
    const xs = numericValues(data, this.options.xField);
    const valid = xs.filter((value) => !Number.isNaN(value));
    if (valid.length === 0) return [];

    let edges: Array<[number, number]>;
    if (this.options.bins) {
      edges = this.options.bins;
    } else {
      const [min, max] = extent(valid) ?? [0, 1];
      const count = this.options.binCount ?? 10;
      const step = (max - min) / count || 1;
      edges = Array.from({ length: count }, (_, i) => [min + i * step, min + (i + 1) * step]);
    }

    const aggregation = this.options.aggregation ?? (this.options.yField ? 'sum' : 'count');
    const ys = this.options.yField ? numericValues(data, this.options.yField) : [];
    return edges.map(([x0, x1], binIndex) => {
      let sum = 0;
      let count = 0;
      xs.forEach((x, i) => {
        const last = binIndex === edges.length - 1;
        if (Number.isNaN(x) || x < x0 || (last ? x > x1 : x >= x1)) return;
        count += 1;
        sum += ys[i] ?? 0;
      });
      const value = aggregation === 'count' ? count : aggregation === 'mean' ? (count ? sum / count : 0) : sum;
      return { x0, x1, value, count };
    });
  }

  override xValues(data: Datum[]): unknown[] {
    return this.computeBins(data).flatMap((bin) => [bin.x0, bin.x1]);
  }

  override yDomain(data: Datum[]): [number, number] | undefined {
    const domain = extent(this.computeBins(data).map((bin) => bin.value));
    if (!domain) return undefined;
    return [Math.min(0, domain[0]), Math.max(0, domain[1])];
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.rects = [];
    if (!this.visible) return;
    const { xScale, yScale } = ctx;
    if (!(xScale instanceof LinearScale) || !(yScale instanceof LinearScale)) {
      throw new Error('grafit: histogram requires numeric axes');
    }
    this.bins = this.computeBins(ctx.data);
    const group = new Group();
    const zero = yScale.convert(0);

    this.bins.forEach((bin, binIndex) => {
      const x0 = xScale.convert(bin.x0);
      const x1 = xScale.convert(bin.x1);
      const y = yScale.convert(bin.value);
      const rect: BinRect = {
        binIndex,
        x: Math.min(x0, x1),
        y: Math.min(y, zero),
        width: Math.abs(x1 - x0),
        height: Math.abs(zero - y),
      };
      this.rects.push(rect);

      const node = new Rect();
      node.x = rect.x;
      node.y = rect.y;
      node.width = rect.width;
      node.height = rect.height;
      node.fill = this.mainColor();
      node.opacity = this.options.fillOpacity ?? 0.85;
      node.stroke = this.options.stroke ?? this.env.theme.backgroundColor;
      node.strokeWidth = this.options.strokeWidth ?? 1;
      group.append(node);

      if (this.options.label?.enabled === true) {
        const labelOptions = this.options.label;
        const placed = placeRectLabel(labelOptions.placement ?? 'top', rect);
        const text = new Text();
        const labelValue = bin.value;
        text.text = labelOptions.formatter ? labelOptions.formatter({ value: bin.value, x0: bin.x0, x1: bin.x1 }) : String(labelValue);
        text.x = placed.x;
        text.y = placed.y;
        text.textAlign = placed.align;
        text.textBaseline = placed.baseline;
        text.fontSize = labelOptions.fontSize ?? 11;
        text.fontWeight = labelOptions.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
        text.fontFamily = labelOptions.fontFamily ?? this.env.theme.fontFamily;
        const elementFill = node.fill ?? this.mainColor();
        text.fill = labelOptions.color ?? (placed.inside ? contrastTextColor(elementFill) : this.env.theme.foregroundColor);
        if (placed.inside) text.outline = elementFill;
        group.append(text);
      }
    });

    if (ctx.highlight && !ctx.highlight.allSeries && ctx.highlight.seriesId !== this.id) {
      group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    }
    group.opacity *= ctx.animationT ?? 1;
    ctx.layer.append(group);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const rect of this.rects) {
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        return {
          seriesId: this.id,
          datumIndex: rect.binIndex,
          distance: 0,
          x: rect.x + rect.width / 2,
          y: rect.y,
        };
      }
    }
    return undefined;
  }

  override tooltipFor(binIndex: number): TooltipContentData {
    const bin = this.bins[binIndex];
    if (!bin) return { rows: [] };
    return {
      heading: `${formatEdge(bin.x0)} – ${formatEdge(bin.x1)}`,
      rows: [{ label: this.seriesName, value: String(Number(bin.value.toFixed(6))), color: this.mainColor() }],
    };
  }
}

function formatEdge(value: number): string {
  return String(Number(value.toFixed(6)));
}

export const histogramSeriesModule: SeriesModule<HistogramSeriesOptions> = {
  kind: 'series',
  type: 'histogram',
  requiredOptions: ['xField'],
  chartKind: 'cartesian',
  create: (options, env) => new HistogramSeries(options as HistogramSeriesOptions & { yField: string }, env),
};
