import {
  CartesianSeries,
  plotBands,
  styleRectItem,
  type RectItemStyle,
  type RectItemStylerParams,
  type SeriesBaseOptions,
} from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianRenderContext, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import { localize } from '@/shared/locale';
import type { ColorValue, Datum, Pixels, Fraction, Styler } from '@/shared/options';
import { LinearScale, groupSlot } from '@/shared/scale';
import { Group, Line, Rect } from '@/shared/scene';
import { extent, tooltipContentOf } from '@/shared/util';

/**
 * What a box-plot tooltip is handed: a box is five numbers, and a renderer
 * that has to reach for them through `datum` would be doing the series' work.
 */
export interface BoxPlotTooltipRendererParams {
  datum: Datum;
  /** Value of xField — the category of the box. */
  xValue: unknown;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  seriesName: string;
  color: ColorValue;
}

/** What the item styler of a box is handed: the five numbers it is drawn from. */
export interface BoxPlotItemStylerParams extends RectItemStylerParams {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

/** The style of one box: its fill, and the stroke of the whole glyph — whiskers, caps and median alike. */
export type BoxPlotItemStyle = Omit<RectItemStyle, 'label'>;

export interface BoxPlotSeriesOptions extends Omit<SeriesBaseOptions<BoxPlotTooltipRendererParams>, 'yField' | 'name'> {
  type: 'box-plot';
  minField: string;
  q1Field: string;
  medianField: string;
  q3Field: string;
  maxField: string;
  name?: string;
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  /** Whisker cap width as a fraction of the box width. */
  capLengthRatio?: Fraction;
  /**
   * Gap between boxes of one category group — fraction of the slot step
   * (0–0.9, default 0.2). Ignored when the series is alone in the band.
   */
  groupGap?: Fraction;
  /**
   * Style of one box by its datum. Undefined leaves the box as it is; a
   * partial style is laid over it.
   */
  itemStyler?: Styler<BoxPlotItemStylerParams, BoxPlotItemStyle>;
}

interface BoxGeometry {
  index: number;
  x: number;
  width: number;
  q1: number;
  q3: number;
}

export class BoxPlotSeries extends CartesianSeries<BoxPlotSeriesOptions & { yField: string }> {
  readonly type = 'box-plot';
  private boxes: BoxGeometry[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  protected override get seriesName(): string {
    return this.options.name ?? 'Distribution';
  }

  /** How a box is painted, in the state it is in: the series style with the item styler over it. */
  private itemStyle(index: number, datum: Datum, stats: number[], highlighted: boolean): BoxPlotItemStyle {
    const [min = NaN, q1 = NaN, median = NaN, q3 = NaN, max = NaN] = stats;
    const stroke = this.options.stroke ?? this.mainColor();
    return styleRectItem(this.options.itemStyler, { datum, index, highlighted, fill: this.mainColor(), stroke, min, q1, median, q3, max });
  }

  /** The five numbers of a box, in order; NaN where a field is missing. */
  private statsOf(datum: Datum): number[] {
    const { minField, q1Field, medianField, q3Field, maxField } = this.options;
    return [minField, q1Field, medianField, q3Field, maxField].map((key) => Number(datum[key]));
  }

  override occupiesBandSlot(): boolean {
    return true;
  }

  override yDomain(data: Datum[]): [number, number] | undefined {
    return extent([...numericValues(data, this.options.minField), ...numericValues(data, this.options.maxField)]);
  }

  override axisKeys(): string[] {
    const { minField, q1Field, medianField, q3Field, maxField } = this.options;
    return [minField, q1Field, medianField, q3Field, maxField];
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.boxes = [];
    if (!this.visible) return;
    const valueScale = ctx.yScale;
    if (!(valueScale instanceof LinearScale)) {
      throw new Error('grafit: box-plot requires a numeric Y axis');
    }
    const bands = plotBands(ctx, 'x', ctx.bandSpan);
    const seriesStroke = this.options.stroke ?? this.mainColor();
    const seriesStrokeWidth = this.options.strokeWidth ?? this.env.theme.markStrokeWidth ?? 1.5;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;
    const group = new Group();

    ctx.data.forEach((datum, index) => {
      const stats = this.statsOf(datum);
      if (stats.some((value) => Number.isNaN(value))) return;
      const [min, q1, median, q3, max] = stats as [number, number, number, number, number];
      const band = bands.bandOf(datum[this.options.xField]);
      if (!band) return;
      const slot = groupSlot(band.size, ctx.group, this.options.groupGap);
      const x = band.start + slot.start + slot.size * 0.15;
      const width = slot.size * 0.7;
      const centerX = x + width / 2;
      const pq1 = valueScale.convert(q1);
      const pq3 = valueScale.convert(q3);
      this.boxes.push({ index, x, width, q1: pq1, q3: pq3 });

      const capWidth = width * (this.options.capLengthRatio ?? 0.5);
      const isSelected = ctx.selected?.has(index) === true;
      const style = this.itemStyle(index, datum, stats, index === highlighted);
      const stroke = style.stroke ?? seriesStroke;
      const strokeWidth = style.strokeWidth ?? seriesStrokeWidth;
      const item = new Group();

      const whisker = new Line();
      whisker.x1 = whisker.x2 = centerX;
      whisker.y1 = valueScale.convert(min);
      whisker.y2 = valueScale.convert(max);
      whisker.stroke = stroke;
      whisker.strokeWidth = strokeWidth;
      item.append(whisker);

      for (const value of [min, max]) {
        const cap = new Line();
        cap.x1 = centerX - capWidth / 2;
        cap.x2 = centerX + capWidth / 2;
        cap.y1 = cap.y2 = valueScale.convert(value);
        cap.stroke = stroke;
        cap.strokeWidth = strokeWidth;
        item.append(cap);
      }

      const box = new Rect();
      box.x = x;
      box.y = Math.min(pq1, pq3);
      box.width = width;
      box.height = Math.abs(pq3 - pq1);
      box.fill = style.fill ?? this.mainColor();
      box.opacity = style.fillOpacity ?? this.options.fillOpacity ?? this.env.theme.fillOpacity ?? 0.45;
      box.stroke = isSelected ? (ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor) : stroke;
      box.strokeWidth = isSelected
        ? (ctx.selectionStyle?.strokeWidth ?? 2)
        : index === highlighted
          ? Math.max(2, strokeWidth)
          : strokeWidth;
      box.cornerRadius = 2;
      item.append(box);

      const medianLine = new Line();
      medianLine.x1 = x;
      medianLine.x2 = x + width;
      medianLine.y1 = medianLine.y2 = valueScale.convert(median);
      medianLine.stroke = stroke;
      medianLine.strokeWidth = strokeWidth + 0.5;
      item.append(medianLine);

      if (ctx.selectionActive && !isSelected) item.opacity = ctx.selectionStyle?.inactiveOpacity ?? 0.45;
      group.append(item);
    });

    if (ctx.highlight && ctx.highlight.seriesId !== this.id) group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    group.opacity *= ctx.animationT ?? 1;
    ctx.layer.append(group);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const box of this.boxes) {
      const top = Math.min(box.q1, box.q3);
      const bottom = Math.max(box.q1, box.q3);
      if (x >= box.x && x <= box.x + box.width && y >= top && y <= bottom) {
        return { seriesId: this.id, datumIndex: box.index, distance: 0, x: box.x + box.width / 2, y: top };
      }
    }
    return undefined;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const box = this.boxes.find((candidate) => candidate.index === datumIndex);
    if (!box) return undefined;
    return { seriesId: this.id, datumIndex, distance: 0, x: box.x + box.width / 2, y: Math.min(box.q1, box.q3) };
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    const color = this.itemStyle(datumIndex, datum, this.statsOf(datum), false).fill ?? this.mainColor();
    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      return tooltipContentOf(
        renderer({
          datum,
          xValue: datum[this.options.xField],
          min: Number(datum[this.options.minField]),
          q1: Number(datum[this.options.q1Field]),
          median: Number(datum[this.options.medianField]),
          q3: Number(datum[this.options.q3Field]),
          max: Number(datum[this.options.maxField]),
          seriesName: this.seriesName,
          color,
        }),
      );
    }
    const locale = this.env.locale;
    return {
      heading: String(datum[this.options.xField]),
      rows: [
        { label: localize(locale, 'boxPlotMax'), value: String(datum[this.options.maxField]), color },
        { label: localize(locale, 'boxPlotQ3'), value: String(datum[this.options.q3Field]), color },
        { label: localize(locale, 'boxPlotMedian'), value: String(datum[this.options.medianField]), color },
        { label: localize(locale, 'boxPlotQ1'), value: String(datum[this.options.q1Field]), color },
        { label: localize(locale, 'boxPlotMin'), value: String(datum[this.options.minField]), color },
      ],
    };
  }
}

export const boxPlotSeriesModule: SeriesModule<BoxPlotSeriesOptions> = {
  kind: 'series',
  type: 'box-plot',
  requiredOptions: ['xField', 'minField', 'q1Field', 'medianField', 'q3Field', 'maxField'],
  chartKind: 'cartesian',
  create: (options, env) => new BoxPlotSeries(options as BoxPlotSeriesOptions & { yField: string }, env),
};
