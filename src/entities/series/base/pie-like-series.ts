import { PolarSeries, type PolarSeriesBaseOptions } from './polar-series';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { LabelGuard, LegendItemDescriptor, PolarRenderContext, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { Datum, ColorValue, Degrees, FontOptions, LabelOverlapOptions, Pixels, Fraction, Switchable } from '@/shared/options';
import { Group, Line, Sector, Text } from '@/shared/scene';
import { contrastTextColor, formatValue } from '@/shared/util';

export interface PieLikeSeriesOptions extends PolarSeriesBaseOptions {
  /** Key of the value that determines the sector angle. */
  angleField: string;
  angleName?: string;
  /** Key of the sector name (legend, labels, tooltip). */
  labelField?: string;
  fills?: ColorValue[];
  strokes?: ColorValue[];
  /** Initial angle, in degrees. */
  rotation?: Degrees;
  /** Fraction of the available radius used by the chart (0.85 by default). */
  outerRadiusRatio?: Fraction;
  /**
   * Sector labels: the name and the value of a sector, drawn as one label so
   * the two always read together. `placement` puts the whole label outside the
   * pie on a callout line or inside the sector.
   */
  label?: PieLabelOptions;
  /**
   * Callout line made of two segments; each is configured separately.
   * By default the color is the sector color.
   */
  calloutLine?: {
    /** Radial segment from the sector. */
    radial?: CalloutSegmentOptions;
    /** Horizontal segment toward the label. */
    horizontal?: CalloutSegmentOptions;
  };
  /** Sector stroke (none by default; use sectorSpacing for gaps). */
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  /** Angular gap between sectors, in px (at the outer radius). */
  sectorSpacing?: Pixels;
  /** Sector corner radius, in px. */
  cornerRadius?: Pixels;
  /** Values in the legend: "label … value". */
  legendValue?: Switchable & { formatter?: (params: PieTooltipRendererParams) => string };
  tooltip?: Switchable & {
    renderer?: (params: PieTooltipRendererParams) => TooltipContentData | string;
  };
}

/** Where the whole sector label goes. */
export type PieLabelPlacement = 'outside' | 'inside';

/** How the two parts of a sector label sit together. */
export type PieLabelLayout = 'stacked' | 'inline';

export interface PieLabelOptions extends Switchable, LabelOverlapOptions {
  /** 'outside' (default) — beside the pie on a callout line; 'inside' — in the sector. */
  placement?: PieLabelPlacement;
  /** 'stacked' (default) — the value on its own line under the name; 'inline' — one line. */
  layout?: PieLabelLayout;
  /** What separates the two parts of an inline label (' · ' by default). */
  separator?: string;
  /** Position along the sector radius, inside placement only (0.7 by default). */
  positionRatio?: Fraction;
  /** Sector name, from `labelField`. On by default whenever there is a name to show. */
  category?: Switchable & FontOptions;
  /** Sector value — its share of the total by default. Off until asked for. */
  value?: PieValueLabelOptions;
  /**
   * Drop a label there is no room for (default false). Off, every sector gets
   * its label and crowded ones are left to overlap; on, the labels stack in
   * rows down each side of the pie and the narrowest sectors are the ones that
   * lose theirs once a side runs out of rows.
   */
  avoidOverlap?: boolean;
  /**
   * Share of the total a sector needs before it is worth labelling, 0..1 (0 by
   * default — every sector is). `0.02` reads as "label what is at least two
   * percent" and leaves a long tail of slivers unlabelled, which is usually
   * what makes a crowded pie legible. Combines with avoidOverlap: this decides
   * which sectors are worth a label, that one whether there is room for it.
   */
  minShare?: Fraction;
}

export interface PieValueLabelOptions extends Switchable, FontOptions {
  /** 'percent' (default) — share of the total; 'value' — the `angleField` value itself. */
  type?: 'percent' | 'value';
  /** Serializable format string for the 'value' type (',.2f', '.0%'). */
  format?: string;
  formatter?: (params: PieLabelFormatterParams) => string;
}

export interface PieLabelFormatterParams {
  datum: Datum;
  /** Sector name (labelField). */
  label: string;
  /** Value of angleField. */
  value: unknown;
  /** Share of the total, 0..1. */
  share: number;
}

export interface PieTooltipRendererParams {
  datum: Datum;
  /** Sector name (labelField). */
  label: string;
  /** Value of angleField. */
  value: unknown;
  color: ColorValue;
}

export interface CalloutSegmentOptions {
  length?: Pixels;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
}

interface SectorGeometry {
  index: number;
  startAngle: number;
  endAngle: number;
  outerRadius: number;
  innerRadius: number;
}

const HIGHLIGHT_POP = 6;
const CALLOUT_LENGTH = 20;
const CALLOUT_TAIL = 20;
/** Gap between the sector edge and the start of the callout line. */
const CALLOUT_SECTOR_GAP = 2;
/** Gap between the end of the tail and the text. */
const CALLOUT_TEXT_GAP = 3;
/**
 * While the sectors are still growing their labels would slide around, so a
 * label waits until its sector is this wide — or until the angles have settled,
 * whichever comes first. A label inside a sector needs more of one than a
 * callout does.
 */
const CALLOUT_MIN_SWEEP = 0.12;
const INSIDE_MIN_SWEEP = 0.25;
/** However long the labels are, the pie keeps this share of the free radius. */
const MIN_CALLOUT_RADIUS_RATIO = 0.35;
/** Baseline-to-baseline breathing room between the two lines of a stacked label. */
const LABEL_LINE_GAP = 2;
const DEFAULT_SEPARATOR = ' · ';

/** One styled run of a sector label: the name, the value, or what separates them. */
interface LabelPart {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  color: ColorValue;
}

/** Shared pie/donut implementation; the difference is innerRadiusRatio and center labels. */
export abstract class PieLikeSeries<O extends PieLikeSeriesOptions = PieLikeSeriesOptions> extends PolarSeries<O> {
  private sectors: SectorGeometry[] = [];
  private center = { x: 0, y: 0 };
  private readonly hiddenSectors = new Set<number>();
  /** Angles of the last render — for animating fraction re-layout. */
  private lastAngles = new Map<number, { start: number; end: number }>();

  toggleItem(index: number): void {
    if (this.hiddenSectors.has(index)) {
      this.hiddenSectors.delete(index);
    } else {
      this.hiddenSectors.add(index);
    }
  }

  protected abstract innerRadiusRatio(): Fraction;

  override needsPolarAxes(): boolean {
    return false;
  }

  protected colorFor(index: number): ColorValue {
    const fills = this.options.fills ?? this.env.theme.palette.fills;
    return fills[index % fills.length] ?? this.env.colors.fill;
  }

  protected labelFor(datum: Datum | undefined, index: number): string {
    if (!datum) return String(index);
    const key = this.options.labelField;
    return key ? String(datum[key]) : String(index);
  }

  /** Whether the name of a sector is part of its label. */
  private get categoryShown(): boolean {
    return this.options.label?.category?.enabled !== false && this.options.labelField !== undefined;
  }

  /** The value is off until asked for — a pie reads as shares without it. */
  private get valueShown(): boolean {
    return this.options.label?.value?.enabled === true;
  }

  private get labelsShown(): boolean {
    return this.options.label?.enabled !== false && (this.categoryShown || this.valueShown);
  }

  private get labelsInside(): boolean {
    return this.options.label?.placement === 'inside';
  }

  private get avoidsOverlap(): boolean {
    return this.options.label?.avoidOverlap === true;
  }

  /** Whether a sector is big enough to be worth a label (label.minShare). */
  private worthLabelling(value: number, total: number): boolean {
    const minShare = this.options.label?.minShare ?? 0;
    return minShare <= 0 || (total > 0 && value / total >= minShare);
  }

  /** Baseline-to-baseline room one callout label takes: they stack in rows beside the pie. */
  private calloutRowHeight(ctx: PolarRenderContext, values: number[], total: number): number {
    let height = 0;
    values.forEach((value, index) => {
      if (value <= 0) return;
      height = Math.max(height, this.labelSize(this.labelParts(this.data[index], index, value, total), ctx.measureText).height);
    });
    return height + 6;
  }

  /**
   * Which sectors get a callout label. Every one worth labelling by default —
   * crowded labels are left to overlap rather than withheld. With
   * label.avoidOverlap on the room has a say too: the labels stack in rows down
   * each side of the pie, and once a side runs out of rows the narrowest
   * sectors there are the ones that lose their label.
   */
  private calloutCandidates(ctx: PolarRenderContext, values: number[], total: number): Set<number> {
    const drawn = new Set<number>();
    values.forEach((value, index) => {
      if (value > 0 && this.worthLabelling(value, total)) drawn.add(index);
    });
    if (!this.avoidsOverlap) return drawn;

    const rotation = ((this.options.rotation ?? 0) * Math.PI) / 180;
    const entries: Array<{ index: number; sweep: number; rightSide: boolean }> = [];
    let cursor = rotation;
    values.forEach((value, index) => {
      const sweep = (value / total) * Math.PI * 2;
      const midAngle = cursor + sweep / 2;
      cursor += sweep;
      if (drawn.has(index)) entries.push({ index, sweep, rightSide: Math.sin(midAngle) >= 0 });
    });
    const rows = Math.max(1, Math.floor(ctx.area.height / this.calloutRowHeight(ctx, values, total)));
    const kept = new Set<number>();
    for (const side of [true, false]) {
      entries
        .filter((entry) => entry.rightSide === side)
        .sort((a, b) => b.sweep - a.sweep)
        .slice(0, rows)
        .forEach((entry) => kept.add(entry.index));
    }
    return kept;
  }

  /** Text of the value part: the share of the total unless the raw value was asked for. */
  private valueText(datum: Datum | undefined, index: number, value: number, total: number): string {
    const options = this.options.label?.value;
    const share = total > 0 ? value / total : 0;
    const raw = datum ? datum[this.options.angleField] : value;
    if (options?.formatter && datum) {
      return options.formatter({ datum, label: this.labelFor(datum, index), value: raw, share });
    }
    if (options?.type === 'value') return options.format ? formatValue(options.format, raw) : String(raw);
    return options?.format ? formatValue(options.format, share) : `${Math.round(share * 100)}%`;
  }

  /**
   * The label of one sector, part by part. Each part carries its own font and
   * colour: the name and the value are one label, styled separately. An inline
   * label keeps the separator between them as a part of its own, so it picks up
   * the font of the name it follows.
   */
  private labelParts(datum: Datum | undefined, index: number, value: number, total: number): LabelPart[] {
    const options = this.options.label;
    const theme = this.env.theme;
    const inside = this.labelsInside;
    const defaultColor = inside ? contrastTextColor(this.colorFor(index)) : theme.foregroundColor;
    const part = (text: string, font: (Switchable & FontOptions) | undefined): LabelPart => ({
      text,
      fontSize: font?.fontSize ?? themeFont(theme, FONT_STEP.label),
      fontFamily: font?.fontFamily ?? theme.fontFamily,
      fontWeight: font?.fontWeight !== undefined ? String(font.fontWeight) : undefined,
      color: font?.color ?? defaultColor,
    });

    const parts: LabelPart[] = [];
    if (this.categoryShown) parts.push(part(this.labelFor(datum, index), options?.category));
    if (this.valueShown) {
      if (parts.length > 0 && options?.layout === 'inline') {
        parts.push({ ...part(options.separator ?? DEFAULT_SEPARATOR, options.category), text: options.separator ?? DEFAULT_SEPARATOR });
      }
      parts.push(part(this.valueText(datum, index, value, total), options?.value));
    }
    return parts;
  }

  private static partFont(part: LabelPart): string {
    return `${part.fontWeight ?? 'normal'} ${part.fontSize}px ${part.fontFamily}`;
  }

  /** Rows the parts are drawn in: one row per part when stacked, all in one when inline. */
  private labelRows(parts: LabelPart[]): LabelPart[][] {
    return this.options.label?.layout === 'inline' ? (parts.length > 0 ? [parts] : []) : parts.map((one) => [one]);
  }

  /** Size of the whole label block — what the layout has to find room for. */
  private labelSize(parts: LabelPart[], measureText: (text: string, font: string) => number): { width: number; height: number } {
    const rows = this.labelRows(parts);
    let width = 0;
    let height = 0;
    rows.forEach((row, index) => {
      width = Math.max(
        width,
        row.reduce((sum, one) => sum + measureText(one.text, PieLikeSeries.partFont(one)), 0),
      );
      height += Math.max(...row.map((one) => one.fontSize)) + (index > 0 ? LABEL_LINE_GAP : 0);
    });
    return { width, height };
  }

  /**
   * Whether the label block gets to keep its spot. Without label.avoidOverlap
   * every label is drawn; with it on the block asks the frame's guard for the
   * room it measured for itself — the parts are several runs over two lines,
   * so no single piece of text describes the box.
   */
  private fitsGuard(ctx: PolarRenderContext, parts: LabelPart[], x: number, y: number, align: 'left' | 'right' | 'center'): boolean {
    const guard: LabelGuard | undefined = this.avoidsOverlap ? ctx.labelGuard : undefined;
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
      font: first ? PieLikeSeries.partFont(first) : '',
      width,
      height,
    });
  }

  /**
   * Draws the label block anchored at (x, y): `align` places the whole block
   * horizontally, the block is always centred on y. `outline` haloes the text
   * against the sector it sits on.
   */
  private drawLabel(
    group: Group,
    parts: LabelPart[],
    x: number,
    y: number,
    align: 'left' | 'right' | 'center',
    measureText: (text: string, font: string) => number,
    outline?: ColorValue,
  ): void {
    const rows = this.labelRows(parts);
    if (rows.length === 0) return;
    const { height } = this.labelSize(parts, measureText);
    let rowTop = y - height / 2;
    for (const row of rows) {
      const rowHeight = Math.max(...row.map((one) => one.fontSize));
      const rowWidth = row.reduce((sum, one) => sum + measureText(one.text, PieLikeSeries.partFont(one)), 0);
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
        cursor += measureText(one.text, PieLikeSeries.partFont(one));
      }
      rowTop += rowHeight + LABEL_LINE_GAP;
    }
  }

  update(ctx: PolarRenderContext): void {
    this.lastCtx = ctx;
    this.sectors = [];
    if (!this.visible) return;
    const { data, centerX, centerY, layer } = ctx;
    this.center = { x: centerX, y: centerY };

    const values = numericValues(data, this.options.angleField).map((value, index) =>
      Number.isNaN(value) || value < 0 || this.hiddenSectors.has(index) ? 0 : value,
    );
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return;

    const calloutEnabled = this.labelsShown && !this.labelsInside;
    // taken from the finished layout, so the set does not change under the animation
    const labelled = calloutEnabled ? this.calloutCandidates(ctx, values, total) : new Set<number>();
    // 85% of the free space by default, less when the callout labels need the room
    const outerRadius = Math.min(
      ctx.radius * (this.options.outerRadiusRatio ?? 0.85),
      calloutEnabled ? this.calloutFittedRadius(ctx, values, total, labelled) : Infinity,
    );
    const innerRadius = outerRadius * this.innerRadiusRatio();
    const t = ctx.animationT ?? 1;
    const rotation = ((this.options.rotation ?? 0) * Math.PI) / 180;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;

    // while the sectors are still growing the labels of the small ones would
    // slide around; they join once the angles have settled
    const settled = (ctx.animationT ?? 1) >= 1 && (ctx.transitionT ?? 1) >= 1;

    const group = new Group();
    const callouts: Array<{
      index: number;
      midAngle: number;
      sweep: number;
      outerRadius: number;
      actualOuterRadius: number;
      parts: LabelPart[];
    }> = [];
    // collected and drawn after every sector, so no sector covers a label
    const inside: Array<{ index: number; sweep: number; x: number; y: number; parts: LabelPart[] }> = [];
    const renderedAngles = new Map<number, { start: number; end: number }>();
    let cursor = rotation;
    values.forEach((value, index) => {
      if (value <= 0) return;
      const sweep = (value / total) * Math.PI * 2 * t;
      const fade = ctx.fadeHighlight;
      const isFading = fade !== undefined && (fade.allSeries === true || fade.seriesId === this.id) && fade.datumIndex === index;
      const pop = index === highlighted ? HIGHLIGHT_POP * (ctx.highlightT ?? 1) : isFading ? HIGHLIGHT_POP * (ctx.fadeHighlightT ?? 0) : 0;
      // fraction re-layout (toggle via the legend) animates from the previous layout
      let startAngle = cursor;
      let endAngle = cursor + sweep;
      const transitionT = ctx.transitionT;
      const previousAngles = this.lastAngles.get(index);
      if (transitionT !== undefined && previousAngles) {
        startAngle = previousAngles.start + (startAngle - previousAngles.start) * transitionT;
        endAngle = previousAngles.end + (endAngle - previousAngles.end) * transitionT;
      }
      renderedAngles.set(index, { start: startAngle, end: endAngle });
      const geometry: SectorGeometry = {
        index,
        startAngle,
        endAngle,
        outerRadius: outerRadius + pop,
        innerRadius,
      };
      cursor += sweep;
      this.sectors.push(geometry);

      const node = new Sector();
      const isSelected = ctx.selected?.has(index) === true;
      node.centerX = centerX;
      node.centerY = centerY;
      node.innerRadius = geometry.innerRadius;
      node.outerRadius = isSelected ? geometry.outerRadius + HIGHLIGHT_POP : geometry.outerRadius;
      node.startAngle = geometry.startAngle;
      node.endAngle = geometry.endAngle;
      node.fill = this.colorFor(index);
      node.stroke = isSelected ? (ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor) : this.options.stroke;
      node.strokeWidth = isSelected
        ? (ctx.selectionStyle?.strokeWidth ?? 1.5)
        : (this.options.strokeWidth ?? this.env.theme.markStrokeWidth ?? 1.5);
      node.cornerRadius = this.options.cornerRadius ?? this.env.theme.cornerRadius ?? 0;
      node.edgeInset = (this.options.sectorSpacing ?? 0) / 2;
      if (ctx.selectionActive && !isSelected) {
        node.opacity = ctx.selectionStyle?.inactiveOpacity ?? 0.45;
      } else if (ctx.highlight && highlighted === undefined) {
        node.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
      }
      group.append(node);

      const midAngle = (geometry.startAngle + geometry.endAngle) / 2;

      if (labelled.has(index) && (settled || sweep > CALLOUT_MIN_SWEEP)) {
        // label layout is based on the base radius (hover only moves the line start)
        callouts.push({
          index,
          midAngle,
          sweep,
          outerRadius,
          actualOuterRadius: geometry.outerRadius,
          parts: this.labelParts(data[index], index, value, total),
        });
      }

      if (this.labelsShown && this.labelsInside && this.worthLabelling(value, total) && (settled || sweep > INSIDE_MIN_SWEEP)) {
        const ratio = this.options.label?.positionRatio ?? 0.7;
        const at = PolarSeries.pointAt(
          centerX,
          centerY,
          midAngle,
          geometry.innerRadius + (geometry.outerRadius - geometry.innerRadius) * ratio,
        );
        inside.push({ index, sweep, x: at.x, y: at.y, parts: this.labelParts(data[index], index, value, total) });
      }
    });
    this.lastAngles = renderedAngles;
    this.renderInsideLabels(group, inside, ctx);
    this.renderCallouts(group, callouts, centerX, centerY, ctx);
    layer.append(group);
  }

  /**
   * Callout labels read outwards from the pie, so a long name on the side eats
   * into the circle: this is the largest radius at which every label still
   * clears the area. Angles are taken from the finished layout — a radius tied
   * to the entrance animation would make the pie breathe while it grows.
   */
  private calloutFittedRadius(ctx: PolarRenderContext, values: number[], total: number, labelled: Set<number>): number {
    const { area, centerX, centerY } = ctx;
    const radial = this.options.calloutLine?.radial?.length ?? CALLOUT_LENGTH;
    const tail = this.options.calloutLine?.horizontal?.length ?? CALLOUT_TAIL;
    const rotation = ((this.options.rotation ?? 0) * Math.PI) / 180;
    // the label starts where the radial and the tail segments end
    const stem = CALLOUT_SECTOR_GAP + radial;

    let fitted = Infinity;
    let cursor = rotation;
    values.forEach((value, index) => {
      const sweep = (value / total) * Math.PI * 2;
      const midAngle = cursor + sweep / 2;
      cursor += sweep;
      if (!labelled.has(index)) return;
      const { width, height } = this.labelSize(this.labelParts(this.data[index], index, value, total), ctx.measureText);
      const sin = Math.sin(midAngle);
      const cos = Math.cos(midAngle);
      // horizontal: the stem, the tail and the text share the room on their side
      const sideways = sin >= 0 ? area.x + area.width - centerX : centerX - area.x;
      if (Math.abs(sin) > 0.001) {
        fitted = Math.min(fitted, (sideways - tail - CALLOUT_TEXT_GAP - width) / Math.abs(sin) - stem);
      }
      // vertical: the label block itself, at whatever height the elbow sits
      const upright = cos >= 0 ? centerY - area.y : area.y + area.height - centerY;
      if (Math.abs(cos) > 0.001) {
        fitted = Math.min(fitted, (upright - height / 2) / Math.abs(cos) - stem);
      }
    });
    return Math.max(fitted, ctx.radius * MIN_CALLOUT_RADIUS_RATIO);
  }

  /**
   * Labels inside the sectors. There is nowhere to move one, so with
   * label.avoidOverlap on the widest sectors ask first and a label landing on
   * a spot already taken is left out; without it every label is drawn.
   */
  private renderInsideLabels(
    group: Group,
    inside: Array<{ index: number; sweep: number; x: number; y: number; parts: LabelPart[] }>,
    ctx: PolarRenderContext,
  ): void {
    const dropped = new Set<number>();
    if (this.avoidsOverlap) {
      for (const label of [...inside].sort((a, b) => b.sweep - a.sweep)) {
        if (!this.fitsGuard(ctx, label.parts, label.x, label.y, 'center')) dropped.add(label.index);
      }
    }
    for (const label of inside) {
      if (dropped.has(label.index)) continue;
      this.drawLabel(group, label.parts, label.x, label.y, 'center', ctx.measureText, this.colorFor(label.index));
    }
  }

  /**
   * Callout labels: always two segments with fixed angles.
   * Collisions are resolved by changing the length of the first (radial) segment.
   */
  private renderCallouts(
    group: Group,
    callouts: Array<{ index: number; midAngle: number; sweep: number; outerRadius: number; actualOuterRadius: number; parts: LabelPart[] }>,
    centerX: number,
    centerY: number,
    ctx: PolarRenderContext,
  ): void {
    if (callouts.length === 0) return;
    const measureText = ctx.measureText;
    const radial = this.options.calloutLine?.radial;
    const horizontal = this.options.calloutLine?.horizontal;
    // two-line labels need two lines' worth of room between neighbours
    const minGap = callouts.reduce((max, one) => Math.max(max, this.labelSize(one.parts, measureText).height), 0) + 6;

    const entries = callouts.map((callout) => {
      const elbow = PolarSeries.pointAt(centerX, centerY, callout.midAngle, callout.outerRadius + 2 + (radial?.length ?? CALLOUT_LENGTH));
      return {
        index: callout.index,
        midAngle: callout.midAngle,
        sweep: callout.sweep,
        actualOuterRadius: callout.actualOuterRadius,
        minRadius: callout.outerRadius + 4,
        parts: callout.parts,
        elbow,
        rightSide: Math.sin(callout.midAngle) >= 0,
        labelY: elbow.y,
      };
    });

    // clusters of overlapping labels are centered around the mean of the elbows,
    // then the radial length is adjusted to the label height (the angle is unchanged)
    for (const side of [true, false]) {
      const sideEntries = entries.filter((entry) => entry.rightSide === side).sort((a, b) => a.labelY - b.labelY);
      const clusters: Array<typeof sideEntries> = [];
      for (const entry of sideEntries) {
        const last = clusters[clusters.length - 1];
        const lastEntry = last?.[last.length - 1];
        if (last && lastEntry && entry.elbow.y < lastEntry.labelY + minGap) {
          last.push(entry);
          const mean = last.reduce((sum, item) => sum + item.elbow.y, 0) / last.length;
          // a cluster too tall for the chart is squeezed into it instead of
          // hanging off the canvas: the labels crowd, but every one is on screen
          const step = Math.min(minGap, (ctx.area.height - minGap) / (last.length - 1));
          last.forEach((item, i) => {
            item.labelY = mean + (i - (last.length - 1) / 2) * step;
          });
        } else {
          clusters.push([entry]);
        }
      }
      // a tall cluster spread around its mean can run off the top or the bottom;
      // the whole cluster slides back in, so the labels keep their spacing
      for (const cluster of clusters) {
        const first = cluster[0];
        const last = cluster[cluster.length - 1];
        if (!first || !last) continue;
        const above = ctx.area.y + minGap / 2 - first.labelY;
        const below = last.labelY - (ctx.area.y + ctx.area.height - minGap / 2);
        const shift = above > 0 ? above : below > 0 ? -below : 0;
        if (shift !== 0) cluster.forEach((item) => (item.labelY += shift));
      }
      // the sideways room an elbow has before its tail and text leave the area
      const sideways = side ? ctx.area.x + ctx.area.width - centerX : centerX - ctx.area.x;
      for (const entry of sideEntries) {
        const cosMid = Math.cos(entry.midAngle);
        if (Math.abs(cosMid) >= 0.05) {
          const sinMid = Math.abs(Math.sin(entry.midAngle));
          // a label pushed far from its own angle asks for a long radial line;
          // it is cut off at the edge of the area rather than run past it
          const reach = sideways - (horizontal?.length ?? CALLOUT_TAIL) - CALLOUT_TEXT_GAP - this.labelSize(entry.parts, measureText).width;
          const limit = sinMid > 0.001 ? Math.max(0, reach) / sinMid : Infinity;
          const t = Math.max(entry.minRadius, Math.min((centerY - entry.labelY) / cosMid, limit));
          entry.elbow = PolarSeries.pointAt(centerX, centerY, entry.midAngle, t);
          entry.labelY = entry.elbow.y;
        }
        // the two segments are one line, so the elbow is the label's height by
        // definition. Beside a sector at 3 or 9 o'clock no radial length reaches
        // that height — the segment leans instead of leaving a gap behind.
        entry.elbow = { x: entry.elbow.x, y: entry.labelY };
      }
    }

    // where the text of an entry starts, once the elbows are final
    const anchorX = (entry: (typeof entries)[number]): number => {
      const direction = entry.rightSide ? 1 : -1;
      return entry.elbow.x + ((horizontal?.length ?? CALLOUT_TAIL) + CALLOUT_TEXT_GAP) * direction;
    };

    // avoidOverlap gives the guard the last word. The widest sectors ask first,
    // so a side that has run out of room drops the narrowest labels on it.
    const dropped = new Set<number>();
    if (this.avoidsOverlap) {
      for (const entry of [...entries].sort((a, b) => b.sweep - a.sweep)) {
        if (!this.fitsGuard(ctx, entry.parts, anchorX(entry), entry.labelY, entry.rightSide ? 'left' : 'right')) {
          dropped.add(entry.index);
        }
      }
    }

    for (const entry of entries) {
      if (dropped.has(entry.index)) continue;
      const sectorColor = this.colorFor(entry.index);
      const direction = entry.rightSide ? 1 : -1;
      // starts at the current (possibly popped-out) sector edge: on hover
      // the label does not move, only the length of the first line changes
      const from = PolarSeries.pointAt(centerX, centerY, entry.midAngle, entry.actualOuterRadius + 2);

      const radialLine = new Line();
      radialLine.x1 = from.x;
      radialLine.y1 = from.y;
      radialLine.x2 = entry.elbow.x;
      radialLine.y2 = entry.elbow.y;
      radialLine.stroke = radial?.stroke ?? sectorColor;
      radialLine.strokeWidth = radial?.strokeWidth ?? 1;
      group.append(radialLine);

      const endX = entry.elbow.x + (horizontal?.length ?? CALLOUT_TAIL) * direction;
      const tail = new Line();
      tail.x1 = entry.elbow.x;
      tail.y1 = entry.labelY;
      tail.x2 = endX;
      tail.y2 = entry.labelY;
      tail.stroke = horizontal?.stroke ?? radial?.stroke ?? sectorColor;
      tail.strokeWidth = horizontal?.strokeWidth ?? radial?.strokeWidth ?? 1;
      group.append(tail);

      this.drawLabel(group, entry.parts, anchorX(entry), entry.labelY, entry.rightSide ? 'left' : 'right', measureText);
    }
  }

  pick(x: number, y: number): SeriesPick | undefined {
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const radius = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    for (const sector of this.sectors) {
      if (radius < sector.innerRadius || radius > sector.outerRadius) continue;
      let a = angle;
      while (a < sector.startAngle) a += Math.PI * 2;
      if (a >= sector.startAngle && a <= sector.endAngle) {
        const mid = (sector.startAngle + sector.endAngle) / 2;
        const anchor = PolarSeries.pointAt(this.center.x, this.center.y, mid, sector.outerRadius * 0.85);
        return { seriesId: this.id, datumIndex: sector.index, distance: 0, x: anchor.x, y: anchor.y };
      }
    }
    return undefined;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const sector = this.sectors.find((candidate) => candidate.index === datumIndex);
    if (!sector) return undefined;
    const mid = (sector.startAngle + sector.endAngle) / 2;
    const anchor = PolarSeries.pointAt(this.center.x, this.center.y, mid, sector.outerRadius * 0.85);
    return { seriesId: this.id, datumIndex, distance: 0, x: anchor.x, y: anchor.y };
  }

  tooltipFor(datumIndex: number): TooltipContentData {
    const data = this.data;
    const datum = data[datumIndex];
    if (!datum) return { rows: [] };
    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      const result = renderer({
        datum,
        label: this.labelFor(datum, datumIndex),
        value: datum[this.options.angleField],
        color: this.colorFor(datumIndex),
      });
      return typeof result === 'string' ? { heading: result, rows: [] } : result;
    }
    const values = numericValues(data, this.options.angleField).map((value) => (Number.isNaN(value) || value < 0 ? 0 : value));
    const total = values.reduce((sum, value) => sum + value, 0);
    const value = values[datumIndex] ?? 0;
    const percent = total > 0 ? ` (${Math.round((value / total) * 100)}%)` : '';
    return {
      heading: this.labelFor(datum, datumIndex),
      rows: [
        {
          label: this.options.angleName ?? this.options.angleField,
          value: `${value}${percent}`,
          color: this.colorFor(datumIndex),
        },
      ],
    };
  }

  legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false || !this.options.labelField) return [];
    const data = this.data;
    return data.map((datum, index) => {
      let value: string | undefined;
      if (this.options.legendValue?.enabled === true) {
        const raw = datum[this.options.angleField];
        value = this.options.legendValue.formatter
          ? this.options.legendValue.formatter({
              datum,
              label: this.labelFor(datum, index),
              value: raw,
              color: this.colorFor(index),
            })
          : String(raw);
      }
      return {
        seriesId: `${this.id}#${index}`,
        label: this.labelFor(datum, index),
        color: this.colorFor(index),
        visible: !this.hiddenSectors.has(index),
        value,
      };
    });
  }
}
