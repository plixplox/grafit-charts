import type { ItemLabelStyle } from './item-styler';
import { StandaloneSeries, type StandaloneSeriesBaseOptions } from './standalone-series';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { LabelGuard, MeasureText } from '@/shared/kernel';
import type { ColorValue, FontOptions, PartLabelBlockOptions, PartLabelLayout, Styler, Switchable } from '@/shared/options';
import type { Group } from '@/shared/scene';
import { drawLabelBlock, formatValue, labelBlockSize, labelParts, partFont, partText, worthLabelling, type LabelPart } from '@/shared/util';

/**
 * What a flow label is handed. A node of a sankey or a chord is not a row of the
 * data — several rows meet in it — so what describes it is its name, what flows
 * through it, and how much of the whole that is.
 */
export interface FlowLabelFormatterParams {
  /** Node name. */
  name: string;
  /** What flows through the node. */
  total: number;
  /** Share of the whole, 0..1: of its column for a sankey node, of the ring for a chord one. */
  share: number;
}

/**
 * What the node styler of a sankey or a chord is handed: a node is known by its
 * name — its place in the palette depends on the layout, which is the series'
 * business — and by what flows through it.
 */
export interface FlowNodeStylerParams {
  /** Node name. */
  name: string;
  /** Column of a sankey node, 0 for the sources; a chord has no columns. */
  depth?: number;
  /** What flows through the node. */
  total: number;
  /** Share of the whole, 0..1: of its column for a sankey node, of the ring for a chord one. */
  share: number;
  /** The color the node would have without the styler — from `fills` or the palette. */
  fill: ColorValue;
}

export interface FlowNodeStyle {
  fill?: ColorValue;
  /** The label of the node; it wins over `label.color` of the series. */
  label?: ItemLabelStyle;
}

export interface FlowSeriesBaseOptions extends StandaloneSeriesBaseOptions {
  /**
   * Style of one node by its name. Undefined leaves the node its palette
   * color; a partial style is laid over it. A link takes the color of the
   * node it flows out of, styled or not.
   */
  nodeStyler?: Styler<FlowNodeStylerParams, FlowNodeStyle>;
  /**
   * Node labels: the name of a node and what flows through it, drawn as one
   * block so the two always read together — each half with its own font and its
   * own format, `layout` putting the value on a line of its own (default) or in
   * the same row behind a separator. The name is printed on its own until
   * `value.enabled` asks for the number too, as on a pie.
   */
  label?: Switchable &
    FontOptions &
    PartLabelBlockOptions<FlowLabelFormatterParams> & {
      /** The whole label at once; it wins over `category`/`value`. */
      formatter?: (params: FlowLabelFormatterParams) => string;
    };
}

/**
 * Base of the flow series — sankey and chord. They draw nothing alike, and say
 * the same thing about a node: this is its name, this is what goes through it.
 * That label lives here, in the shape a part of a whole takes everywhere else in
 * the library.
 */
export abstract class FlowSeries<O extends FlowSeriesBaseOptions> extends StandaloneSeries<O> {
  /** The name half of the label; there unless it was switched off. */
  protected get categoryShown(): boolean {
    return this.options.label?.category?.enabled !== false;
  }

  /** The value half; asked for, as on a pie — a node name is what most charts want. */
  protected get valueShown(): boolean {
    return this.options.label?.value?.enabled === true;
  }

  protected get labelsShown(): boolean {
    return this.options.label?.enabled !== false && (this.categoryShown || this.valueShown);
  }

  protected get labelLayout(): PartLabelLayout | undefined {
    return this.options.label?.layout;
  }

  /**
   * How a node is painted: its palette color by the place `paletteIndex` the
   * layout gave it, with the node styler over it.
   */
  protected nodeStyle(params: Omit<FlowNodeStylerParams, 'fill'>, paletteIndex: number): FlowNodeStyle & { fill: ColorValue } {
    const fill = this.colorFor(paletteIndex);
    const style = this.options.nodeStyler?.({ ...params, fill });
    return { ...style, fill: style?.fill ?? fill };
  }

  /** Whether a node carries enough of the whole to be worth a label (label.minShare). */
  protected worthLabelling(total: number, whole: number): boolean {
    return worthLabelling(total, whole, this.options.label?.minShare);
  }

  /** Text of the name half: what the label's own format says, then the name as it stands. */
  private categoryText(params: FlowLabelFormatterParams): string {
    return partText(params.name, this.options.label?.category, params);
  }

  /**
   * Text of the value half: what flows through the node, or its share of the
   * whole where `type: 'percent'` asked for one.
   */
  private valueText(params: FlowLabelFormatterParams): string {
    const options = this.options.label?.value;
    const formatted = options?.formatter?.(params);
    if (formatted !== undefined) return formatted;
    if (options?.type === 'percent') {
      return options.format ? formatValue(options.format, params.share) : `${Math.round(params.share * 100)}%`;
    }
    return options?.format ? formatValue(options.format, params.total) : String(params.total);
  }

  /** The label of one node, run by run: the name and the value, each with its own font. */
  protected labelPartsFor(params: FlowLabelFormatterParams, color?: ColorValue): LabelPart[] {
    const options = this.options.label;
    const theme = this.env.theme;
    const defaults = {
      fontSize: options?.fontSize ?? themeFont(theme, FONT_STEP.label),
      fontFamily: options?.fontFamily ?? theme.fontFamily,
      fontWeight: options?.fontWeight !== undefined ? String(options.fontWeight) : 'normal',
      // the node styler speaks for one node, so it wins over the series
      color: color ?? options?.color ?? theme.foregroundColor,
    };
    if (options?.formatter) return labelParts([{ text: options.formatter(params) }], defaults, options);
    const entries: Array<{ text: string; font?: Switchable & FontOptions }> = [];
    if (this.categoryShown) entries.push({ text: this.categoryText(params), font: options?.category });
    if (this.valueShown) entries.push({ text: this.valueText(params), font: options?.value });
    return labelParts(entries, defaults, options);
  }

  /** Size of the whole block — what a layout has to find room for. */
  protected labelSize(parts: readonly LabelPart[], measureText: MeasureText): { width: number; height: number } {
    return labelBlockSize(parts, measureText, this.labelLayout);
  }

  /**
   * Draws the block at (x, y), or leaves the spot to a label already there when
   * `label.avoidOverlap` is on — the runs are several pieces of text over two
   * lines, so the guard is told the box rather than any one of them.
   */
  protected drawNodeLabel(
    group: Group,
    parts: readonly LabelPart[],
    x: number,
    y: number,
    align: 'left' | 'right' | 'center',
    measureText: MeasureText,
    guard: LabelGuard | undefined,
  ): void {
    if (parts.length === 0) return;
    if (this.options.label?.avoidOverlap === true && guard) {
      const { width, height } = this.labelSize(parts, measureText);
      const first = parts[0];
      const admitted = guard.admits({
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
      if (!admitted) return;
    }
    drawLabelBlock(group, parts, x, y, align, measureText, this.labelLayout);
  }
}
