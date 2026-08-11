/**
 * Series whose marks read as parts of a whole — a pie sector, a funnel stage, a
 * pyramid layer — ask the same three questions about a part: how much of the
 * total it is, whether that is enough to be worth a label, and which labels
 * survive when they run out of room. The answers live here so the series that
 * differ only in shape do not each carry their own.
 */
import { formatValue } from './format';
import { numericValues } from '@/shared/data';
import type { MeasureText, SelectionStyleContext, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Formattable, Fraction, PartLabelLayout, Pixels, Switchable } from '@/shared/options';
import { Group, Text } from '@/shared/scene';

/** Values of a part field, with everything that cannot be a share read as zero. */
export function partValues(data: Datum[], field: string): number[] {
  return numericValues(data, field).map((value) => (Number.isNaN(value) || value < 0 ? 0 : value));
}

/** Whether a part is a big enough share of the total to be worth a label (label.minShare). */
export function worthLabelling(value: number, total: number, minShare: Fraction | undefined): boolean {
  return minShare === undefined || minShare <= 0 || (total > 0 && value / total >= minShare);
}

/**
 * Which labels lose their spot with label.avoidOverlap on. The largest parts
 * ask first, so a crowded chart drops the labels of its slivers rather than
 * whichever ones happen to be drawn last.
 */
export function crowdedOut<T>(entries: readonly T[], weight: (entry: T) => number, admits: (entry: T) => boolean): Set<T> {
  const dropped = new Set<T>();
  for (const entry of [...entries].sort((a, b) => weight(b) - weight(a))) {
    if (!admits(entry)) dropped.add(entry);
  }
  return dropped;
}

export interface PartTooltipParams {
  /** Part name — the heading of the tooltip. */
  heading: string;
  /** What the single row is called: the series name, or the value field. */
  label: string;
  value: unknown;
  /** Share of the total, 0..1; undefined when there is no total to compare against. */
  share?: number;
  color: ColorValue;
}

/** The default tooltip of a part: its name, its value and its share of the whole. */
export function partTooltip({ heading, label, value, share, color }: PartTooltipParams): TooltipContentData {
  const percent = share === undefined ? '' : ` (${Math.round(share * 100)}%)`;
  return { heading, rows: [{ label, value: `${String(value)}${percent}`, color }] };
}

/** What a tooltip renderer returned, as content: a bare string is the heading. */
export function tooltipContentOf(result: string | TooltipContentData): TooltipContentData {
  return typeof result === 'string' ? { heading: result, rows: [] } : result;
}

/** One styled run of a part label: the name, the value, or what separates them. */
export interface LabelPart {
  text: string;
  fontSize: Pixels;
  fontFamily: string;
  fontWeight?: string;
  color: ColorValue;
}

/**
 * What a format contract says about a value — the formatter first, then the
 * format string. Undefined when it says nothing, so the caller can fall back to
 * the next contract in line: the half of a label defers to the name format of
 * the series, which defers to the raw value.
 */
export function formattedText<P>(raw: unknown, options: Formattable<P> | undefined, params: P): string | undefined {
  const formatted = options?.formatter?.(params);
  if (formatted !== undefined) return formatted;
  return options?.format !== undefined ? formatValue(options.format, raw) : undefined;
}

/**
 * Text of one half of a label: the format contract, or the raw field value when
 * it has nothing to say. Both halves of a block answer the same way — a name
 * that comes out of a date or a coded field is formatted like the number
 * beside it.
 */
export function partText<P>(raw: unknown, options: Formattable<P> | undefined, params: P): string {
  return formattedText(raw, options, params) ?? String(raw);
}

/** The font every part of a label falls back to. */
export interface LabelPartDefaults {
  fontSize: Pixels;
  fontFamily: string;
  fontWeight?: string;
  color: ColorValue;
}

/** Baseline-to-baseline breathing room between the lines of a stacked label. */
const LABEL_LINE_GAP = 2;
const DEFAULT_SEPARATOR = ' · ';

export function partFont(part: LabelPart): string {
  return `${part.fontWeight ?? 'normal'} ${part.fontSize}px ${part.fontFamily}`;
}

/**
 * The label of one part, run by run. Each run carries its own font and colour —
 * the name and the value are one label, styled separately — and an inline label
 * keeps the separator as a run of its own, so it picks up the font of the name
 * it follows. Runs given without a font of their own fall back to `defaults`.
 */
export function labelParts(
  entries: ReadonlyArray<{ text: string; font?: (Switchable & FontOptions) | undefined }>,
  defaults: LabelPartDefaults,
  options?: { layout?: PartLabelLayout; separator?: string },
): LabelPart[] {
  const run = (text: string, font: (Switchable & FontOptions) | undefined): LabelPart => ({
    text,
    fontSize: font?.fontSize ?? defaults.fontSize,
    fontFamily: font?.fontFamily ?? defaults.fontFamily,
    fontWeight: font?.fontWeight !== undefined ? String(font.fontWeight) : defaults.fontWeight,
    color: font?.color ?? defaults.color,
  });

  const parts: LabelPart[] = [];
  entries.forEach((entry, index) => {
    if (index > 0 && options?.layout === 'inline') {
      parts.push(run(options.separator ?? DEFAULT_SEPARATOR, entries[index - 1]?.font));
    }
    parts.push(run(entry.text, entry.font));
  });
  return parts;
}

/** Rows the runs are drawn in: one row per run when stacked, all in one when inline. */
export function labelRows(parts: readonly LabelPart[], layout: PartLabelLayout | undefined): LabelPart[][] {
  return layout === 'inline' ? (parts.length > 0 ? [[...parts]] : []) : parts.map((one) => [one]);
}

/** Size of the whole label block — what the layout has to find room for. */
export function labelBlockSize(
  parts: readonly LabelPart[],
  measureText: MeasureText,
  layout: PartLabelLayout | undefined,
): { width: number; height: number } {
  let width = 0;
  let height = 0;
  labelRows(parts, layout).forEach((row, index) => {
    width = Math.max(
      width,
      row.reduce((sum, one) => sum + measureText(one.text, partFont(one)), 0),
    );
    height += Math.max(...row.map((one) => one.fontSize)) + (index > 0 ? LABEL_LINE_GAP : 0);
  });
  return { width, height };
}

/**
 * Draws the label block anchored at (x, y): `align` places the whole block
 * horizontally, the block is always centred on y. `outline` haloes the text
 * against the mark it sits on.
 */
export function drawLabelBlock(
  group: Group,
  parts: readonly LabelPart[],
  x: number,
  y: number,
  align: 'left' | 'right' | 'center',
  measureText: MeasureText,
  layout: PartLabelLayout | undefined,
  outline?: ColorValue,
): void {
  const rows = labelRows(parts, layout);
  if (rows.length === 0) return;
  let rowTop = y - labelBlockSize(parts, measureText, layout).height / 2;
  for (const row of rows) {
    const rowHeight = Math.max(...row.map((one) => one.fontSize));
    const rowWidth = row.reduce((sum, one) => sum + measureText(one.text, partFont(one)), 0);
    let cursor = align === 'left' ? x : align === 'right' ? x - rowWidth : x - rowWidth / 2;
    for (const one of row) {
      const node = new Text();
      node.text = one.text;
      node.x = cursor;
      node.y = rowTop + rowHeight / 2;
      node.textAlign = 'left';
      node.textBaseline = 'middle';
      node.fontSize = one.fontSize;
      node.fontFamily = one.fontFamily;
      if (one.fontWeight !== undefined) node.fontWeight = one.fontWeight;
      node.fill = one.color;
      if (outline) node.outline = outline;
      group.append(node);
      cursor += measureText(one.text, partFont(one));
    }
    rowTop += rowHeight + LABEL_LINE_GAP;
  }
}

/** A mark the selection can style: whatever the shape, it has an outline and an opacity. */
export interface SelectableMark {
  stroke?: ColorValue;
  strokeWidth: Pixels;
  opacity: number;
}

/** What a series knows about the selection while it renders. */
export interface PartSelectionContext {
  selected?: ReadonlySet<number>;
  selectionActive?: boolean;
  selectionStyle?: SelectionStyleContext;
}

const DEFAULT_SELECTION_STROKE_WIDTH = 1.5;
const DEFAULT_INACTIVE_OPACITY = 0.45;

/**
 * How a selection reads on a part: the picked-out ones are outlined, the rest
 * fade back while any selection is active. `fallback` is the outline the mark
 * carries on its own — a selected mark borrows the foreground colour instead.
 */
export function applySelection(
  mark: SelectableMark,
  index: number,
  ctx: PartSelectionContext,
  fallback: { stroke?: ColorValue; strokeWidth?: Pixels; foreground: ColorValue },
): boolean {
  const isSelected = ctx.selected?.has(index) === true;
  if (isSelected) {
    mark.stroke = ctx.selectionStyle?.stroke ?? fallback.foreground;
    mark.strokeWidth = ctx.selectionStyle?.strokeWidth ?? DEFAULT_SELECTION_STROKE_WIDTH;
  } else {
    mark.stroke = fallback.stroke;
    if (fallback.strokeWidth !== undefined) mark.strokeWidth = fallback.strokeWidth;
    if (ctx.selectionActive === true) {
      mark.opacity *= ctx.selectionStyle?.inactiveOpacity ?? DEFAULT_INACTIVE_OPACITY;
    }
  }
  return isSelected;
}
