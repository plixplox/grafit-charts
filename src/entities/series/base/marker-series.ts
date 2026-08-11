import { CartesianSeries, type SeriesBaseOptions } from './cartesian-series';
import { placePointLabel, pointBlockCenter, pointBlockOverflow, POINT_LABEL_GAP } from './point-label';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY, FONT_STEP, themeFont } from '@/shared/kernel';
import type {
  CartesianGeometry,
  CartesianRenderContext,
  Insets,
  LabelOverflowContext,
  MeasureText,
  SeriesPick,
  TooltipContentData,
} from '@/shared/kernel';
import type {
  ColorValue,
  Datum,
  Pixels,
  Fraction,
  Styler,
  FontOptions,
  Formattable,
  PartLabelBlockOptions,
  PartLabelLayout,
  PartNameParams,
  PartValueLabelOptions,
  Switchable,
} from '@/shared/options';
import { Group, Marker, type MarkerShape } from '@/shared/scene';
import {
  contrastTextColor,
  crowdedOut,
  drawLabelBlock,
  formatValue,
  formattedText,
  labelBlockSize,
  labelParts,
  partFont,
  partText,
  partValues,
  worthLabelling,
  NO_OVERFLOW,
  type LabelPart,
} from '@/shared/util';

export interface MarkerItemStylerParams {
  datum: Datum;
  index: number;
  highlighted: boolean;
  fill: ColorValue;
  stroke: ColorValue | undefined;
  size: Pixels;
}

export interface MarkerItemStyle {
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  size?: Pixels;
}

export interface MarkerSeriesBaseOptions extends SeriesBaseOptions {
  /** Y value name in the tooltip (yField by default). */
  yName?: string;
  /**
   * Data key of the point name — the heading of its tooltip and the name half
   * of its label. Without it a point is only known by its coordinates.
   */
  labelField?: string;
  /**
   * How the value of `labelField` becomes text — for the tooltip heading and
   * the name half of a point label alike. `label.category` overrides it where
   * a label wants something shorter.
   */
  labelName?: Formattable<PartNameParams>;
  shape?: MarkerShape;
  size?: Pixels;
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  itemStyler?: Styler<MarkerItemStylerParams, MarkerItemStyle>;
  /**
   * Point labels: the name of the point (`labelField`) and its value, drawn as
   * one block — each half with its own font, `layout` putting the value behind
   * a separator (default) or on a line of its own. `placement` hangs the block
   * off the marker: top (by default) / bottom / left / right / inside.
   */
  label?: Switchable &
    FontOptions &
    PartLabelBlockOptions<MarkerLabelFormatterParams> & {
      /** inside — within the marker (for bubble), auto-contrast + outline. */
      placement?: 'top' | 'bottom' | 'left' | 'right' | 'inside';
      /** The whole label at once; it wins over `category`/`value`. */
      formatter?: (params: { value: number; datum: Datum }) => string;
    };
}

export interface MarkerLabelFormatterParams {
  datum: Datum;
  /** Point name (labelField); the index when there is none. */
  label: string;
  /** Value of yField — of sizeField for a bubble, the field the point is a share of. */
  value: unknown;
  /** Share of the total, 0..1. */
  share: number;
}

/** Point value — the value itself by default; `type: 'percent'` reads it as a share. */
export type MarkerValueLabelOptions = PartValueLabelOptions<MarkerLabelFormatterParams>;

const PICK_RANGE = 30;

/** The three alignments a label block understands, from the canvas' seven. */
function blockAlign(align: CanvasTextAlign): 'left' | 'right' | 'center' {
  if (align === 'left' || align === 'start') return 'left';
  if (align === 'right' || align === 'end') return 'right';
  return 'center';
}
interface MarkerPoint {
  index: number;
  x: number;
  y: number;
}

/** Shared base for point series (scatter, bubble). */
export abstract class MarkerSeries<O extends MarkerSeriesBaseOptions> extends CartesianSeries<O> {
  protected points: MarkerPoint[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  preferredXAxisType(): 'number' {
    return 'number';
  }

  /** Point marker size (bubble overrides it based on sizeField). */
  protected sizeFor(_index: number): Pixels {
    return this.options.size ?? 8;
  }

  /** Hook before iterating the data (bubble computes the size domain). */
  protected prepare(_ctx: CartesianGeometry): void {}

  /** Marker positions in plot coordinates; shared by rendering and label measurement. */
  protected layoutPoints(ctx: CartesianGeometry): MarkerPoint[] {
    const { data, xScale, yScale } = ctx;
    const values = numericValues(data, this.options.yField);
    const points: MarkerPoint[] = [];
    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) return;
      const x = CartesianSeries.positionOn(xScale, datum[this.options.xField]);
      const y = CartesianSeries.positionOn(yScale, value);
      if (Number.isNaN(x) || Number.isNaN(y)) return;
      points.push({ index, x, y });
    });
    return points;
  }

  /** Distance from the point to its label: the marker radius plus the gap. */
  private labelOffset(index: number): number {
    return this.sizeFor(index) / 2 + POINT_LABEL_GAP;
  }

  /** Name of a point, from labelField; the index stands in when there is none. */
  protected labelFor(datum: Datum | undefined, index: number): string {
    const key = this.options.labelField;
    if (key === undefined || !datum) return String(index);
    return partText(datum[key], this.options.labelName, { datum, value: datum[key] });
  }

  /** Whether the name of a point is part of its label — there has to be one to show. */
  private get categoryShown(): boolean {
    return this.options.label?.category?.enabled !== false && this.options.labelField !== undefined;
  }

  /** A point label has always been the value, so the value stays part of it by default. */
  private get valueShown(): boolean {
    return this.options.label?.value?.enabled !== false;
  }

  /** 'inline' by default: the value follows the name behind a separator. */
  private get labelLayout(): PartLabelLayout {
    return this.options.label?.layout ?? 'inline';
  }

  /**
   * The field a point is a share of: the y value for a scatter, the bubble size
   * for a bubble — what `minShare` and `value.type: 'percent'` are measured in.
   */
  protected shareField(): string {
    return this.options.yField;
  }

  /**
   * With label.avoidOverlap on, which points ask for room first. Undefined —
   * the order of the data, the rule every Cartesian series follows; a bubble
   * overrides it, so the big bubbles keep their labels.
   */
  protected labelPriority(_index: number): number | undefined {
    return undefined;
  }

  /** Shares of the total by data index, in whatever field the points are shares of. */
  private shares(data: Datum[]): { values: number[]; total: number } {
    const values = partValues(data, this.shareField());
    return { values, total: values.reduce((sum, value) => sum + value, 0) };
  }

  /**
   * Text of the name half. The field a point is named by carries a format of
   * its own — a date, a code — so the name is formatted like the value beside
   * it rather than printed raw.
   */
  private categoryText(datum: Datum, index: number, share: number): string {
    const name = this.labelFor(datum, index);
    const key = this.options.labelField;
    if (key === undefined) return name;
    // a label may want something shorter than the tooltip, so its own format wins
    return (
      formattedText(datum[key], this.options.label?.category, {
        datum,
        label: name,
        value: datum[this.shareField()],
        share,
      }) ?? name
    );
  }

  /** Text of the value half: the y value unless a share was asked for. */
  private valueText(datum: Datum, index: number, share: number): string {
    const options = this.options.label?.value;
    const raw = datum[this.shareField()];
    if (options?.formatter) return options.formatter({ datum, label: this.labelFor(datum, index), value: raw, share });
    if (options?.type === 'percent') return options.format ? formatValue(options.format, share) : `${Math.round(share * 100)}%`;
    return options?.format ? formatValue(options.format, raw) : String(raw);
  }

  /**
   * The label of one point, run by run. `label.formatter` speaks for the whole
   * label when it is given; otherwise the name and the value are two runs, each
   * with its own font over the label's.
   */
  private labelPartsFor(datum: Datum, index: number, share: number): LabelPart[] {
    const options = this.options.label;
    const inside = options?.placement === 'inside';
    const defaults = {
      fontSize: options?.fontSize ?? themeFont(this.env.theme, FONT_STEP.label),
      fontFamily: options?.fontFamily ?? this.env.theme.fontFamily,
      fontWeight: options?.fontWeight !== undefined ? String(options.fontWeight) : 'normal',
      color: options?.color ?? (inside ? contrastTextColor(this.mainColor()) : this.env.theme.foregroundColor),
    };
    if (options?.formatter) {
      return labelParts([{ text: options.formatter({ value: Number(datum[this.options.yField]), datum }) }], defaults, options);
    }
    const entries: Array<{ text: string; font?: Switchable & FontOptions }> = [];
    if (this.categoryShown) entries.push({ text: this.categoryText(datum, index, share), font: options?.category });
    if (this.valueShown) entries.push({ text: this.valueText(datum, index, share), font: options?.value });
    return labelParts(entries, defaults, { layout: this.labelLayout, separator: options?.separator });
  }

  /** Size of the whole label block — what the layout has to find room for. */
  private labelSize(parts: LabelPart[], measureText: MeasureText): { width: number; height: number } {
    return labelBlockSize(parts, measureText, this.labelLayout);
  }

  /** The label blocks to draw, with the points they hang off — minShare has already had its say. */
  private labelBlocks(ctx: CartesianGeometry): Array<{ index: number; x: number; y: number; parts: LabelPart[] }> {
    const { values, total } = this.shares(ctx.data);
    const minShare = this.options.label?.minShare;
    return this.layoutPoints(ctx).flatMap((point) => {
      const datum = ctx.data[point.index];
      const value = values[point.index] ?? 0;
      if (!datum || !worthLabelling(value, total, minShare)) return [];
      const parts = this.labelPartsFor(datum, point.index, total > 0 ? value / total : 0);
      return parts.length > 0 ? [{ index: point.index, x: point.x, y: point.y, parts }] : [];
    });
  }

  override labelOverflow(ctx: LabelOverflowContext): Insets {
    const label = this.options.label;
    if (!this.visible || label?.enabled !== true) return NO_OVERFLOW;
    this.prepare(ctx);
    // the block, not a single line: a stacked label is taller and only as wide as its widest run
    const marks = this.labelBlocks(ctx).map((block) => ({
      x: block.x,
      y: block.y,
      ...this.labelSize(block.parts, ctx.measureText),
      offset: this.labelOffset(block.index),
    }));
    return pointBlockOverflow(marks, label.placement ?? 'top', ctx.plot);
  }

  override tooltipFor(datumIndex: number, mode?: 'single' | 'shared'): TooltipContentData {
    if (this.options.tooltip?.renderer || mode === 'shared') return super.tooltipFor(datumIndex);
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    // both axes of a point series are measures, so the x value is a labelled
    // row like the others; the heading names the point when it has a name of
    // its own, and the series otherwise
    return {
      heading: {
        text: this.options.labelField !== undefined ? this.labelFor(datum, datumIndex) : this.seriesName,
        color: this.mainColor(),
      },
      rows: [
        { label: this.options.xName ?? this.options.xField, value: String(datum[this.options.xField]) },
        { label: this.options.yName ?? this.options.yField, value: String(datum[this.options.yField]) },
      ],
    };
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.points = [];
    if (!this.visible) return;
    this.prepare(ctx);

    const { data } = ctx;
    const group = new Group();
    const labels = new Group();
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;

    this.points = this.layoutPoints(ctx);
    this.points.forEach((point) => {
      const { index, x, y } = point;
      const datum = data[index];
      if (!datum) return;

      const isHighlighted = index === highlighted;
      const isSelected = ctx.selected?.has(index) === true;
      const style = ctx.selectionStyle;
      const baseSize = this.sizeFor(index);
      let fill = this.mainColor();
      let stroke = isSelected ? (style?.stroke ?? this.env.theme.foregroundColor) : this.options.stroke;
      let strokeWidth = isSelected ? (style?.strokeWidth ?? 2) : (this.options.strokeWidth ?? 1);
      let size = isSelected ? baseSize * (style?.sizeRatio ?? 1.4) : isHighlighted ? baseSize * 1.4 : baseSize;
      const styler = this.options.itemStyler;
      if (styler) {
        const style = styler({ datum, index, highlighted: isHighlighted, fill, stroke, size });
        fill = style?.fill ?? fill;
        stroke = style?.stroke ?? stroke;
        strokeWidth = style?.strokeWidth ?? strokeWidth;
        size = style?.size ?? size;
      }

      const marker = new Marker();
      marker.x = x;
      marker.y = y;
      marker.shape = this.options.shape ?? 'circle';
      marker.size = size;
      marker.fill = fill;
      marker.opacity = this.options.fillOpacity ?? this.env.theme.fillOpacity ?? 0.85;
      marker.stroke = stroke ?? this.env.theme.backgroundColor;
      marker.strokeWidth = strokeWidth;
      if (ctx.selectionActive && !isSelected)
        marker.opacity = (this.options.fillOpacity ?? this.env.theme.fillOpacity ?? 0.85) * (style?.inactiveOpacity ?? 0.45);
      group.append(marker);
    });

    if (ctx.highlight && !ctx.highlight.allSeries && ctx.highlight.seriesId !== this.id) {
      group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    }
    group.opacity *= ctx.animationT ?? 1;

    if (this.options.label?.enabled === true) {
      const labelOptions = this.options.label;
      const placement = labelOptions.placement ?? 'top';
      const outline = placement === 'inside' ? this.mainColor() : this.env.theme.backgroundColor;
      const placed = this.labelBlocks(ctx).map((block) => {
        const at = placePointLabel(block.x, block.y, placement, this.labelOffset(block.index));
        const { height } = this.labelSize(block.parts, ctx.measureText);
        return { ...block, at, y: pointBlockCenter(at, height) };
      });

      // the guard is asked in the order of the data, unless the series has a
      // size of its own to rank the points by (a bubble does)
      const dropped =
        labelOptions.avoidOverlap === true
          ? crowdedOut(
              placed,
              (block) => this.labelPriority(block.index) ?? -block.index,
              (block) => this.blockFits(ctx, block.parts, block.at.x, block.y, block.at.align),
            )
          : new Set<(typeof placed)[number]>();
      for (const block of placed) {
        if (dropped.has(block)) continue;
        drawLabelBlock(labels, block.parts, block.at.x, block.y, blockAlign(block.at.align), ctx.measureText, this.labelLayout, outline);
      }
    }

    this.appendGroups(ctx, group, labels);
  }

  /**
   * Whether the label block gets to keep its spot: the runs span several lines,
   * so no single piece of text describes the box it takes.
   */
  private blockFits(ctx: CartesianRenderContext, parts: LabelPart[], x: number, y: number, align: CanvasTextAlign): boolean {
    const guard = ctx.labelGuard;
    if (!guard) return true;
    const { width, height } = this.labelSize(parts, ctx.measureText);
    const first = parts[0];
    return guard.admits({
      text: parts.map((one) => one.text).join(''),
      x,
      y,
      align,
      baseline: 'middle',
      fontSize: first?.fontSize ?? 0,
      font: first ? partFont(first) : '',
      width,
      height,
    });
  }

  pickInRect(x0: number, y0: number, x1: number, y1: number): number[] {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    return this.points
      .filter((point) => point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY)
      .map((point) => point.index);
  }

  pick(x: number, y: number, searchRadius?: number): SeriesPick | undefined {
    const limit = searchRadius === 0 ? 6 : (searchRadius ?? PICK_RANGE);
    let best: SeriesPick | undefined;
    for (const point of this.points) {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= limit && (best === undefined || distance < best.distance)) {
        best = { seriesId: this.id, datumIndex: point.index, distance, x: point.x, y: point.y };
      }
    }
    return best;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const point = this.points.find((candidate) => candidate.index === datumIndex);
    if (!point) return undefined;
    return { seriesId: this.id, datumIndex, distance: 0, x: point.x, y: point.y };
  }
}
