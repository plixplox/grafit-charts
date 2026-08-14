import { StandaloneSeries, type StandaloneSeriesBaseOptions } from '@/entities/series/base';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { LegendItemDescriptor, MeasureText, SeriesModule, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
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
} from '@/shared/options';
import { Group, Line, Path } from '@/shared/scene';
import {
  applySelection,
  contrastTextColor,
  crowdedOut,
  drawLabelBlock,
  formattedText,
  formatValue,
  labelBlockSize,
  labelParts,
  partFont,
  partText,
  partTooltip,
  partValues,
  tooltipContentOf,
  worthLabelling,
  type LabelPart,
} from '@/shared/util';

export interface PyramidSeriesOptions extends StandaloneSeriesBaseOptions<PyramidTooltipRendererParams> {
  type: 'pyramid';
  stageField: string;
  valueField: string;
  name?: string;
  /**
   * How the value of `stageField` becomes text — for the legend, the tooltip
   * heading and the name half of a layer label alike. A name is a field value,
   * and the format of that field belongs to the series rather than to each
   * place the name is printed in. `label.category` overrides it where a label
   * wants something shorter than the legend.
   */
  stageName?: Formattable<PartNameParams>;
  /** Bottom-up (apex at the top by default). */
  reverse?: boolean;
  /** Gap between segments (0 by default — solid pyramid). */
  itemSpacing?: Pixels;
  /** Fraction of the plot width used by the shape (0.62 by default); independent of labels. */
  widthRatio?: number;
  /**
   * Layer labels: the name and the value of a layer, drawn as one block so the
   * two always read together — each half with its own font, `layout` putting
   * the value in the same row (default) or on a line of its own. `placement`
   * moves the whole block outside the shape (default) or inside it, where the
   * text colour follows the contrast of the layer.
   */
  label?: Switchable &
    FontOptions &
    PartLabelBlockOptions<PyramidLabelFormatterParams> & {
      placement?: 'inside' | 'outside';
      /** The whole label at once; it wins over `category`/`value`. */
      formatter?: (params: { datum: Datum; stage: string; value: number }) => string;
    };
  /** Line from a segment to its outside label (segment color by default). */
  calloutLine?: Switchable & { length?: Pixels; stroke?: ColorValue; strokeWidth?: Pixels };
  tooltip?: Switchable & {
    renderer?: (params: PyramidTooltipRendererParams) => TooltipContentData | string;
  };
}

export interface PyramidTooltipRendererParams {
  datum: Datum;
  /** Layer name (stageField). */
  stage: string;
  /** Value of valueField. */
  value: unknown;
  color: ColorValue;
}

export interface PyramidLabelFormatterParams {
  datum: Datum;
  /** Layer name (stageField). */
  stage: string;
  /** Value of valueField. */
  value: unknown;
  /** Share of the total, 0..1. */
  share: number;
}

/** Layer value — the value itself by default; `type: 'percent'` reads it as a share. */
export type PyramidValueLabelOptions = PartValueLabelOptions<PyramidLabelFormatterParams>;

/** Breathing room between two outside labels the spreading pushed apart. */
const LABEL_SPREAD_GAP = 5;

export class PyramidSeries extends StandaloneSeries<PyramidSeriesOptions> {
  readonly type = 'pyramid';

  override valueFields(): string[] {
    return [this.options.valueField];
  }

  update(ctx: StandaloneRenderContext): void {
    this.lastCtx = ctx;
    this.hits = [];
    if (!this.visible) return;
    const { data, plot } = ctx;
    const values = partValues(data, this.options.valueField);
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return;
    const t = ctx.animationT ?? 1;
    // geometry does not depend on labels: the pyramid is always centered
    const centerX = plot.x + plot.width / 2;
    const height = plot.height;
    const maxWidth = plot.width * (this.options.widthRatio ?? 0.62) * t;
    const group = new Group();
    const insideLabels: Array<{ index: number; value: number; parts: LabelPart[]; x: number; y: number }> = [];
    const outsideLabels: Array<{ index: number; value: number; parts: LabelPart[]; edgeX: number; segmentY: number; labelY: number }> = [];

    // width of the triangle envelope at a relative height (0 is the apex)
    const envelope = (ratio: number) => maxWidth * ratio;
    let cursor = 0;
    data.forEach((datum, index) => {
      const value = values[index] ?? 0;
      if (value <= 0) return;
      const r0 = cursor / total;
      const r1 = (cursor + value) / total;
      cursor += value;
      const flip = this.options.reverse === true;
      const topRatio = flip ? 1 - r0 : r0;
      const bottomRatio = flip ? 1 - r1 : r1;
      const gap = this.options.itemSpacing ?? 0;
      const yTop = plot.y + (flip ? (1 - topRatio) * height : r0 * height) + (index > 0 ? gap / 2 : 0);
      const yBottom = plot.y + (flip ? (1 - bottomRatio) * height : r1 * height) - (index < data.length - 1 ? gap / 2 : 0);
      const widthTop = envelope(flip ? topRatio : r0);
      const widthBottom = envelope(flip ? bottomRatio : r1);

      const path = new Path();
      path.moveTo(centerX - widthTop / 2, yTop);
      path.lineTo(centerX + widthTop / 2, yTop);
      path.lineTo(centerX + widthBottom / 2, yBottom);
      path.lineTo(centerX - widthBottom / 2, yBottom);
      path.closePath();
      path.fill = this.colorFor(index);
      // the selection reads on a layer exactly as it does on a pie sector:
      // the picked-out layers are outlined, the rest fade back
      applySelection(path, index, ctx, { foreground: this.env.theme.foregroundColor });
      group.append(path);
      const hitWidth = Math.max(widthTop, widthBottom, 40);
      this.registerHit(index, centerX - hitWidth / 2, Math.min(yTop, yBottom), hitWidth, Math.abs(yBottom - yTop));

      if (this.options.label?.enabled !== false && worthLabelling(value, total, this.options.label?.minShare)) {
        const parts = this.labelPartsFor(datum, index, value, total);
        if (parts.length > 0) {
          if (this.options.label?.placement === 'inside') {
            insideLabels.push({ index, value, parts, x: centerX, y: (yTop + yBottom) / 2 });
          } else {
            outsideLabels.push({
              index,
              value,
              parts,
              edgeX: centerX + (widthTop + widthBottom) / 4, // edge at mid-height
              segmentY: (yTop + yBottom) / 2,
              labelY: (yTop + yBottom) / 2,
            });
          }
        }
      }
    });

    // outside labels: vertical spreading, the line tilts toward the shifted label
    const labelOptions = this.options.label;
    let previousBottom = -Infinity;
    for (const entry of outsideLabels) {
      const blockHeight = this.labelSize(entry.parts, ctx.measureText).height;
      entry.labelY = Math.max(entry.labelY, previousBottom + blockHeight / 2 + LABEL_SPREAD_GAP);
      previousBottom = entry.labelY + blockHeight / 2;
    }
    const calloutLength = this.options.calloutLine?.length ?? 14;

    // every label block with its own anchor; the guard has the last word before
    // any of them is drawn, so the labels land on top of the finished shape
    const pending = [
      ...insideLabels.map((entry) => ({
        index: entry.index,
        value: entry.value,
        parts: entry.parts,
        x: entry.x,
        y: entry.y,
        align: 'center' as const,
        outline: this.colorFor(entry.index) as string | undefined, // halo in the segment color
        callout: undefined as Line | undefined,
      })),
      ...outsideLabels.map((entry) => {
        let callout: Line | undefined;
        if (this.options.calloutLine?.enabled !== false) {
          callout = new Line();
          callout.x1 = entry.edgeX + 3;
          callout.y1 = entry.segmentY;
          callout.x2 = entry.edgeX + 3 + calloutLength;
          callout.y2 = entry.labelY;
          callout.stroke = this.options.calloutLine?.stroke ?? this.colorFor(entry.index);
          callout.strokeWidth = this.options.calloutLine?.strokeWidth ?? 1;
        }
        return {
          index: entry.index,
          value: entry.value,
          parts: entry.parts,
          x: entry.edgeX + 3 + calloutLength + 5,
          y: entry.labelY,
          align: 'left' as const,
          outline: undefined as string | undefined,
          callout,
        };
      }),
    ];

    // with avoidOverlap on the thickest layers ask for room first: a pyramid
    // sliced thin at the apex loses those labels rather than the ones below
    const dropped =
      labelOptions?.avoidOverlap === true
        ? crowdedOut(
            pending,
            (entry) => entry.value,
            (entry) => this.blockFits(ctx, entry.parts, entry.x, entry.y, entry.align),
          )
        : new Set<(typeof pending)[number]>();
    for (const entry of pending) {
      if (dropped.has(entry)) continue;
      // a label that lost its room takes its callout line with it
      if (entry.callout) group.append(entry.callout);
      drawLabelBlock(group, entry.parts, entry.x, entry.y, entry.align, ctx.measureText, this.labelLayout, entry.outline);
    }
    ctx.layer.append(group);
  }

  /** Name of a layer: the value of stageField, as `stageName` spells it out. */
  private stageNameOf(datum: Datum): string {
    const raw = datum[this.options.stageField];
    return partText(raw, this.options.stageName, { datum, value: raw });
  }

  /** Whether the name of a layer is part of its label. */
  private get categoryShown(): boolean {
    return this.options.label?.category?.enabled !== false;
  }

  /** A pyramid reads as "layer · value", so the value is part of the label by default. */
  private get valueShown(): boolean {
    return this.options.label?.value?.enabled !== false;
  }

  /** 'inline' by default: the value follows the name behind a separator. */
  private get labelLayout(): PartLabelLayout {
    return this.options.label?.layout ?? 'inline';
  }

  /**
   * Text of the name half. The field a layer is named by carries a format of
   * its own — a date, a code — so the name is formatted like the value beside
   * it rather than printed raw.
   */
  private categoryText(datum: Datum, stage: string, value: number, total: number): string {
    // a label may want something shorter than the legend, so its own format
    // wins; without one the layer reads the same wherever its name appears
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
   * The label of one layer, run by run. `label.formatter` speaks for the whole
   * label when it is given; otherwise the name and the value are two runs, each
   * with its own font over the label's.
   */
  private labelPartsFor(datum: Datum, index: number, value: number, total: number): LabelPart[] {
    const options = this.options.label;
    const stage = this.stageNameOf(datum);
    const inside = options?.placement === 'inside';
    const defaults = {
      fontSize: options?.fontSize ?? themeFont(this.env.theme, FONT_STEP.heading),
      fontFamily: options?.fontFamily ?? this.env.theme.fontFamily,
      fontWeight: options?.fontWeight !== undefined ? String(options.fontWeight) : 'normal',
      color: options?.color ?? (inside ? contrastTextColor(this.colorFor(index)) : this.env.theme.foregroundColor),
    };
    if (options?.formatter) {
      return labelParts([{ text: options.formatter({ datum, stage, value }) }], defaults, options);
    }
    const entries: Array<{ text: string; font?: Switchable & FontOptions }> = [];
    if (this.categoryShown) entries.push({ text: this.categoryText(datum, stage, value, total), font: options?.category });
    if (this.valueShown) entries.push({ text: this.valueText(datum, stage, value, total), font: options?.value });
    return labelParts(entries, defaults, { layout: this.labelLayout, separator: options?.separator });
  }

  /** Size of the whole label block — what the spreading and the guard work with. */
  private labelSize(parts: LabelPart[], measureText: MeasureText): { width: number; height: number } {
    return labelBlockSize(parts, measureText, this.labelLayout);
  }

  /**
   * Whether the label block gets to keep its spot: the runs span several lines,
   * so no single piece of text describes the box it takes.
   */
  private blockFits(ctx: StandaloneRenderContext, parts: LabelPart[], x: number, y: number, align: 'left' | 'center'): boolean {
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
    // the share of the total, as a pie reads it — it is what the layer height shows
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

  override legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    return this.data.map((datum, index) => ({
      seriesId: `${this.id}#${index}`,
      label: this.stageNameOf(datum),
      color: this.colorFor(index),
      visible: true,
    }));
  }
}

export const pyramidSeriesModule: SeriesModule<PyramidSeriesOptions> = {
  kind: 'series',
  type: 'pyramid',
  requiredOptions: ['stageField', 'valueField'],
  chartKind: 'hierarchy',
  create: (options, env) => new PyramidSeries(options, env),
};
