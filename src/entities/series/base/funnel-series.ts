import { CartesianSeries } from './cartesian-series';
import type { LabelFont } from './rect-label';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type {
  CartesianGeometry,
  CartesianRenderContext,
  Insets,
  LabelOverflowContext,
  LegendItemDescriptor,
  MeasureText,
  SeriesPick,
  TooltipContentData,
} from '@/shared/kernel';
import type {
  ColorValue,
  Datum,
  FontOptions,
  Formattable,
  PartLabelBlockOptions,
  PartLabelLayout,
  PartNameParams,
  PartValueLabelOptions,
  Pixels,
  Switchable,
  Showable,
} from '@/shared/options';
import { Group, Line, Path, Rect } from '@/shared/scene';
import {
  applySelection,
  contrastTextColor,
  crowdedOut,
  drawLabelBlock,
  formattedText,
  formatValue,
  labelBlockSize,
  labelParts,
  maxOverflow,
  overflowOutside,
  partFont,
  partText,
  partTooltip,
  partValues,
  textBounds,
  tooltipContentOf,
  worthLabelling,
  NO_OVERFLOW,
  type LabelPart,
} from '@/shared/util';

export interface FunnelSeriesBaseOptions extends Showable {
  id?: string;
  /** Stage name. */
  stageField: string;
  /** Stage value. */
  valueField: string;
  /**
   * How the value of `stageField` becomes text — for the legend, the tooltip
   * heading and the name half of a stage label alike. A name is a field value,
   * and the format of that field belongs to the series rather than to each
   * place the name is printed in. `label.category` overrides it where a label
   * wants something shorter than the legend.
   */
  stageName?: Formattable<PartNameParams>;
  name?: string;
  fills?: ColorValue[];
  showInLegend?: boolean;
  /** Gap between segments (4 by default). */
  itemSpacing?: Pixels;
  /** Fraction of the plot width used by the shape (0.62 by default); independent of labels. */
  widthRatio?: number;
  /**
   * Stage labels: the name and the value of a stage, drawn as one block so the
   * two always read together — each half with its own font, `layout` putting
   * the value in the same row (default) or on a line of its own. `placement`
   * moves the whole block inside the segment (auto-contrast) or outside it, on
   * a callout line to the right.
   */
  label?: Switchable &
    FontOptions &
    PartLabelBlockOptions<FunnelLabelFormatterParams> & {
      placement?: 'inside' | 'outside';
      /** The whole label at once; it wins over `category`/`value`. */
      formatter?: (params: { datum: Datum; stage: string; value: number }) => string;
    };
  /** Line from a segment to its outside label (segment color by default). */
  calloutLine?: Switchable & { length?: Pixels; stroke?: ColorValue; strokeWidth?: Pixels };
  tooltip?: Switchable & {
    renderer?: (params: FunnelTooltipRendererParams) => TooltipContentData | string;
  };
}

export interface FunnelTooltipRendererParams {
  datum: Datum;
  /** Stage name (stageField). */
  stage: string;
  /** Value of valueField. */
  value: unknown;
  color: ColorValue;
}

export interface FunnelLabelFormatterParams {
  datum: Datum;
  /** Stage name (stageField). */
  stage: string;
  /** Value of valueField. */
  value: unknown;
  /** Share of the total, 0..1. */
  share: number;
}

/** Stage value — the value itself by default; `type: 'percent'` reads it as a share. */
export type FunnelValueLabelOptions = PartValueLabelOptions<FunnelLabelFormatterParams>;

interface StageGeometry {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StageLayout extends StageGeometry {
  /** Width of the stage below — the lower edge of a trapezoid. */
  nextWidth: number;
  /** Where the callout line leaves the shape. */
  edgeX: number;
  /** The label of the stage, run by run: the name, the separator, the value. */
  parts: LabelPart[];
  value: number;
  /** Whether the stage is a big enough share of the total to be worth a label. */
  labelled: boolean;
}

const DEFAULT_WIDTH_RATIO = 0.62;
const CALLOUT_LENGTH = 14;
/** Gap between the shape edge and the callout line. */
const EDGE_GAP = 3;
/** Gap between the callout line and the text. */
const LABEL_GAP = 5;

/** Base for funnel/cone-funnel: stages top to bottom, width by value, no axes. */
export abstract class FunnelSeriesBase<O extends FunnelSeriesBaseOptions> extends CartesianSeries<O & { xField: string; yField: string }> {
  private stages: StageGeometry[] = [];

  /** Trapezoids between stages (cone) or rectangles (funnel). */
  protected abstract trapezoid(): boolean;

  protected mainColor(): ColorValue {
    return this.colorFor(0);
  }

  protected colorFor(index: number): ColorValue {
    const fills = this.options.fills ?? this.env.theme.palette.fills;
    return fills[index % fills.length] ?? this.env.colors.fill;
  }

  hidesAxes(): boolean {
    return true;
  }

  override xValues(data: Datum[]): unknown[] {
    return data.map((datum) => datum[this.options.stageField]);
  }

  override yDomain(): [number, number] | undefined {
    return undefined;
  }

  /** A funnel binds no axis, so its value is named here and nowhere else. */
  override valueFields(): string[] {
    return [this.options.valueField];
  }

  override legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    const data = this.lastCtx?.data ?? [];
    return data.map((datum, index) => ({
      seriesId: `${this.id}#${index}`,
      label: this.stageNameOf(datum),
      color: this.colorFor(index),
      visible: true,
    }));
  }

  /** Name of a stage: the value of stageField, as `stageName` spells it out. */
  protected stageNameOf(datum: Datum): string {
    const raw = datum[this.options.stageField];
    return partText(raw, this.options.stageName, { datum, value: raw });
  }

  /** Font of the stage labels: the options over the theme default. */
  private labelFontOf(): LabelFont {
    const label = this.options.label;
    return {
      size: label?.fontSize ?? themeFont(this.env.theme, FONT_STEP.heading),
      weight: label?.fontWeight !== undefined ? String(label.fontWeight) : 'normal',
      family: label?.fontFamily ?? this.env.theme.fontFamily,
    };
  }

  /** Whether the name of a stage is part of its label. */
  private get categoryShown(): boolean {
    return this.options.label?.category?.enabled !== false;
  }

  /** A funnel reads as "stage · value", so the value is part of the label by default. */
  private get valueShown(): boolean {
    return this.options.label?.value?.enabled !== false;
  }

  private get labelsOutside(): boolean {
    return this.options.label?.placement === 'outside';
  }

  /** 'inline' by default: the value follows the name behind a separator. */
  private get labelLayout(): PartLabelLayout {
    return this.options.label?.layout ?? 'inline';
  }

  /**
   * Text of the name half. The field a stage is named by carries a format of
   * its own — a date, a code — so the name is formatted like the value beside
   * it rather than printed raw.
   */
  private categoryText(datum: Datum, stage: string, value: number, total: number): string {
    // a label may want something shorter than the legend, so its own format
    // wins; without one the stage reads the same wherever its name appears
    return (
      formattedText(datum[this.options.stageField], this.options.label?.category, {
        datum,
        stage,
        value: datum[this.options.valueField],
        share: total > 0 ? value / total : 0,
      }) ?? stage
    );
  }

  /** Text of the value half: the raw value unless a share was asked for. */
  private valueText(datum: Datum, stage: string, value: number, total: number): string {
    const options = this.options.label?.value;
    const share = total > 0 ? value / total : 0;
    const raw = datum[this.options.valueField];
    if (options?.formatter) return options.formatter({ datum, stage, value: raw, share });
    if (options?.type === 'percent') return options.format ? formatValue(options.format, share) : `${Math.round(share * 100)}%`;
    return options?.format ? formatValue(options.format, raw) : String(raw);
  }

  /**
   * The label of one stage, run by run. `label.formatter` speaks for the whole
   * label when it is given; otherwise the name and the value are two runs, each
   * with its own font over the label's.
   */
  private labelPartsFor(datum: Datum, index: number, value: number, total: number): LabelPart[] {
    const options = this.options.label;
    const stage = this.stageNameOf(datum);
    const font = this.labelFontOf();
    const defaults = {
      fontSize: font.size,
      fontFamily: font.family,
      fontWeight: font.weight,
      color: options?.color ?? (this.labelsOutside ? this.env.theme.foregroundColor : contrastTextColor(this.colorFor(index))),
    };
    if (options?.formatter) {
      return labelParts([{ text: options.formatter({ datum, stage, value }) }], defaults, options);
    }
    const entries: Array<{ text: string; font?: Switchable & FontOptions }> = [];
    if (this.categoryShown) entries.push({ text: this.categoryText(datum, stage, value, total), font: options?.category });
    if (this.valueShown) entries.push({ text: this.valueText(datum, stage, value, total), font: options?.value });
    return labelParts(entries, defaults, { layout: this.labelLayout, separator: options?.separator });
  }

  /** Size of the whole label block — what the layout has to find room for. */
  private labelSize(parts: LabelPart[], measureText: MeasureText): { width: number; height: number } {
    return labelBlockSize(parts, measureText, this.labelLayout);
  }

  /**
   * Whether the label block gets to keep its spot: the runs span several lines,
   * so no single piece of text describes the box it takes.
   */
  private blockFits(ctx: CartesianRenderContext, parts: LabelPart[], x: number, y: number, align: 'left' | 'center'): boolean {
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

  /** Distance from the shape edge to the start of an outside label. */
  private calloutReach(): number {
    return EDGE_GAP + (this.options.calloutLine?.length ?? CALLOUT_LENGTH) + LABEL_GAP;
  }

  /**
   * Stages top to bottom. edgeX is where the callout line leaves the shape —
   * the slanted side of a trapezoid is met at mid-height.
   */
  private layoutStages(ctx: CartesianGeometry, t: number): StageLayout[] {
    const { data, plot } = ctx;
    const values = partValues(data, this.options.valueField);
    const max = Math.max(...values, 0);
    if (max <= 0 || data.length === 0) return [];

    const stageGap = this.options.itemSpacing ?? 4;
    const stageHeight = (plot.height - stageGap * (data.length - 1)) / data.length;
    const widthFactor = this.options.widthRatio ?? DEFAULT_WIDTH_RATIO;
    const centerX = plot.x + plot.width / 2;
    const total = values.reduce((sum, value) => sum + value, 0);

    return data.map((datum, index) => {
      const value = values[index] ?? 0;
      const width = (value / max) * plot.width * widthFactor * t;
      const nextWidth = ((values[index + 1] ?? value) / max) * plot.width * widthFactor * t;
      const y = plot.y + index * (stageHeight + stageGap);
      return {
        index,
        x: centerX - width / 2,
        y,
        width,
        height: stageHeight,
        nextWidth,
        edgeX: centerX + (this.trapezoid() ? (width + nextWidth) / 4 : width / 2),
        parts: this.labelPartsFor(datum, index, value, total),
        value,
        labelled: worthLabelling(value, total, this.options.label?.minShare),
      };
    });
  }

  /**
   * Outside labels read to the right of the shape, so the layout has to keep
   * that column clear of the plot rect — measured on the finished shape (t = 1).
   */
  override labelOverflow(ctx: LabelOverflowContext): Insets {
    const label = this.options.label;
    if (!this.visible || label?.enabled === false || label?.placement !== 'outside') return NO_OVERFLOW;
    const reach = this.calloutReach();
    let overflow = NO_OVERFLOW;
    for (const stage of this.layoutStages(ctx, 1)) {
      if (!stage.labelled) continue;
      // the block, not a single line: a stacked label is taller and only as wide as its widest run
      const { width, height } = this.labelSize(stage.parts, ctx.measureText);
      const bounds = textBounds(stage.edgeX + reach, stage.y + stage.height / 2, width, height, 'left', 'middle');
      overflow = maxOverflow(overflow, overflowOutside(bounds, ctx.plot));
    }
    return overflow;
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.stages = [];
    if (!this.visible) return;
    const { plot } = ctx;
    const centerX = plot.x + plot.width / 2;
    const group = new Group();
    const labels = new Group();
    // the labels are drawn after every segment, so the guard sees them in the
    // order of the stage size rather than top to bottom
    const pending: Array<{ layout: StageLayout; x: number; y: number }> = [];

    this.layoutStages(ctx, ctx.animationT ?? 1).forEach((layout) => {
      const { index, width, nextWidth, y, height: stageHeight } = layout;
      const stage: StageGeometry = { index, x: layout.x, y, width, height: stageHeight };
      this.stages.push(stage);

      let mark: Path | Rect;
      if (this.trapezoid()) {
        const path = new Path();
        path.moveTo(centerX - width / 2, y);
        path.lineTo(centerX + width / 2, y);
        path.lineTo(centerX + nextWidth / 2, y + stageHeight);
        path.lineTo(centerX - nextWidth / 2, y + stageHeight);
        path.closePath();
        path.fill = this.colorFor(index);
        mark = path;
      } else {
        const node = new Rect();
        node.x = stage.x;
        node.y = y;
        node.width = width;
        node.height = stageHeight;
        node.cornerRadius = 3;
        node.fill = this.colorFor(index);
        mark = node;
      }
      // the selection reads on a stage exactly as it does on a pie sector:
      // the picked-out stages are outlined, the rest fade back
      applySelection(mark, index, ctx, { foreground: this.env.theme.foregroundColor });
      group.append(mark);

      // the label block is anchored beside the shape (outside) or on the
      // segment itself, where a segment-coloured halo keeps it readable
      if (this.options.label?.enabled !== false && layout.labelled && layout.parts.length > 0) {
        pending.push({
          layout,
          x: this.labelsOutside ? layout.edgeX + this.calloutReach() : centerX,
          y: y + stageHeight / 2,
        });
      }
    });

    const outside = this.labelsOutside;
    const dropped =
      this.options.label?.avoidOverlap === true
        ? crowdedOut(
            pending,
            (entry) => entry.layout.value,
            (entry) => this.blockFits(ctx, entry.layout.parts, entry.x, entry.y, outside ? 'left' : 'center'),
          )
        : new Set<(typeof pending)[number]>();
    for (const entry of pending) {
      if (dropped.has(entry)) continue;
      const { layout } = entry;
      // outside label sits next to its segment, connected by a short line —
      // a label that lost its room takes the line with it
      if (outside && this.options.calloutLine?.enabled !== false) {
        const calloutLength = this.options.calloutLine?.length ?? CALLOUT_LENGTH;
        const callout = new Line();
        callout.x1 = layout.edgeX + EDGE_GAP;
        callout.y1 = layout.y + layout.height / 2;
        callout.x2 = layout.edgeX + EDGE_GAP + calloutLength;
        callout.y2 = layout.y + layout.height / 2;
        callout.stroke = this.options.calloutLine?.stroke ?? this.colorFor(layout.index);
        callout.strokeWidth = this.options.calloutLine?.strokeWidth ?? 1;
        group.append(callout);
      }
      drawLabelBlock(
        labels,
        layout.parts,
        entry.x,
        entry.y,
        outside ? 'left' : 'center',
        ctx.measureText,
        this.labelLayout,
        outside ? undefined : this.colorFor(layout.index),
      );
    }
    this.appendGroups(ctx, group, labels);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const stage of this.stages) {
      if (x >= stage.x && x <= stage.x + stage.width && y >= stage.y && y <= stage.y + stage.height) {
        return {
          seriesId: this.id,
          datumIndex: stage.index,
          distance: 0,
          x: stage.x + stage.width / 2,
          y: stage.y,
        };
      }
    }
    return undefined;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const stage = this.stages.find((candidate) => candidate.index === datumIndex);
    if (!stage) return undefined;
    return { seriesId: this.id, datumIndex, distance: 0, x: stage.x + stage.width / 2, y: stage.y };
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const data = this.lastCtx?.data ?? [];
    const datum = data[datumIndex];
    if (!datum) return { rows: [] };
    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      return tooltipContentOf(
        renderer({
          datum,
          stage: this.stageNameOf(datum),
          value: datum[this.options.valueField],
          color: this.colorFor(datumIndex),
        }),
      );
    }
    // the share of the total, as a pie reads it: a stage against the whole funnel
    const values = partValues(data, this.options.valueField);
    const total = values.reduce((sum, value) => sum + value, 0);
    return partTooltip({
      heading: this.stageNameOf(datum),
      label: this.options.name ?? this.options.valueField,
      value: datum[this.options.valueField],
      share: total > 0 ? (values[datumIndex] ?? 0) / total : undefined,
      color: this.colorFor(datumIndex),
    });
  }
}
