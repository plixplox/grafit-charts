import { BaseAxis, DEFAULT_PADDING_INNER, DEFAULT_PADDING_OUTER, formatAxisNumber, type AxisBaseOptions } from '@/entities/axis/base';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { AxisModule, LayoutRect, MeasureText } from '@/shared/kernel';
import type { FontOptions, Pixels, Switchable } from '@/shared/options';
import { BandScale } from '@/shared/scale';
import { Group, Line, Text } from '@/shared/scene';
import { ELLIPSIS, ellipsize, formatValue } from '@/shared/util';

/**
 * What a group name is handed: the value of its own level and the run of
 * categories it covers. A group has no tick index of its own — it stands over
 * a range of them — so it gets its own params instead of the tick label's.
 */
export interface GroupLabelFormatterParams {
  /** Raw value of the level — the tuple element this row is built from. */
  value: unknown;
  /** Row number: 0 is the outermost row, the one furthest from the plot. */
  level: number;
  /** Domain index of the first category the group covers. */
  start: number;
  /** Domain index of the last category the group covers. */
  end: number;
}

/**
 * The rows of group names: their own font and colour over the tick labels', and
 * their own format for the level value. `enabled: false` drops the rows
 * altogether — the item labels stay, the axis stops reserving room for groups.
 */
export type GroupLabelOptions = Switchable &
  FontOptions & {
    /** Serializable format string (',.2f', '%b %Y') applied to the level value. */
    format?: string;
    formatter?: (params: GroupLabelFormatterParams) => string;
    /**
     * Widest a group name may be, px. Without it, `label.overflow: 'ellipsis'`
     * gives a name the run it stands over — enough to keep it clear of the
     * separators on either side. Cutting uses `label.ellipsis` for its mark.
     */
    maxWidth?: Pixels;
  };

export interface GroupedCategoryAxisOptions extends AxisBaseOptions {
  type: 'grouped-category';
  paddingInner?: number;
  paddingOuter?: number;
  /** Gap between categories in px; takes precedence over `paddingInner`. */
  gap?: Pixels;
  /** Gap between the item labels and the group row, and between group rows, px. */
  groupSpacing?: Pixels;
  /** The rows of group names — `label`, but for the levels above the item. */
  groupLabel?: GroupLabelOptions;
}

/** Room a group row takes on top of its glyphs. */
const GROUP_ROW_LEADING = 5;
const GROUP_SPACING = 8;
/** How far the separator between groups runs past the group row. */
const SEPARATOR_OVERSHOOT = 10;
/** Leading between the label rows of a vertical axis: they read as lines of text, not as words in one. */
const LABEL_ROW_LEADING = 4;

/** A run of neighbouring categories that share a level, in pixels along the axis. */
interface GroupRun {
  start: number;
  end: number;
  /** Domain index of the first category — what makes a boundary identifiable. */
  first: number;
  /** Domain index of the last category the run covers. */
  last: number;
  previousEnd?: number;
}

/** A run with the name that stands over it — naming costs a formatter call, so it waits until asked. */
interface GroupSpan extends GroupRun {
  text: string;
}

/**
 * Hierarchical categories: data values are [group, …, item] arrays.
 * Item labels are drawn by the base class; a row of group names is added below
 * for every level above the item, the outermost level furthest from the plot.
 */
export class GroupedCategoryAxis extends BaseAxis<GroupedCategoryAxisOptions> {
  readonly type = 'grouped-category';
  readonly scale = new BandScale<unknown>();

  setDomain(domain: unknown[], weights?: number[]): void {
    this.scale.domain = domain;
    this.scale.weights = weights;
    this.scale.paddingInner = this.options.paddingInner ?? DEFAULT_PADDING_INNER;
    this.scale.paddingOuter = this.options.paddingOuter ?? DEFAULT_PADDING_OUTER;
  }

  layout(plot: LayoutRect): void {
    this.layoutBandScale(this.scale, plot, this.options.paddingInner ?? DEFAULT_PADDING_INNER, this.options.gap);
  }

  protected override formatTick(value: unknown, index: number): string {
    const formatter = this.options.label?.formatter;
    if (formatter) return formatter({ value, index });
    if (Array.isArray(value)) return String(value[value.length - 1]);
    return String(value);
  }

  protected tickInfo(): Array<{ value: unknown; coord: number }> {
    return this.scale.domain.map((value) => ({ value, coord: this.scale.center(value) }));
  }

  protected override tickWeight(value: unknown): number {
    return this.scale.weightOf(value);
  }

  override measure(measureText: MeasureText): number {
    return super.measure(measureText) + this.groupRows * (this.groupSpacing() + this.groupRowHeight());
  }

  private groupSpacing(): number {
    return this.options.groupSpacing ?? GROUP_SPACING;
  }

  /**
   * How many rows of group names the domain asks for: one per tuple level above
   * the item, so a `[year, quarter, month]` domain gets two.
   */
  private get groupRows(): number {
    if (this.options.groupLabel?.enabled === false) return 0;
    let levels = 0;
    for (const value of this.scale.domain) if (Array.isArray(value)) levels = Math.max(levels, value.length - 1);
    return levels;
  }

  /** Row thickness: the glyph row plus the leading that keeps rows apart. */
  private groupRowHeight(): number {
    return this.groupFontSize + GROUP_ROW_LEADING;
  }

  /**
   * How far the row of `level` sits from the end of the tick labels. Rows go
   * outwards from the innermost level, so level 0 ends up furthest away.
   */
  private rowOffset(level: number): number {
    return (this.groupRows - level) * (this.groupSpacing() + this.groupRowHeight()) - this.groupRowHeight();
  }

  /**
   * How much of the gap above a band belongs to it. Inside labels sit in that
   * gap, so a group starts where its first label starts, not where its first
   * band does — otherwise every group name reads a row too low.
   */
  private get insideLead(): number {
    if (this.isHorizontal || !this.labelsInside) return 0;
    return this.scale.stepSize - this.scale.bandwidth;
  }

  /**
   * One row of groups: runs of neighbouring categories whose tuple matches down
   * to `level`. The levels nest — a run at level 1 never spans two different
   * level-0 groups — and values are compared as values, so `null` and `'null'`
   * stay two groups the way they are two categories.
   */
  private groupRuns(level: number): GroupRun[] {
    const domain = this.scale.domain;
    const lead = this.insideLead;
    const runs: GroupRun[] = [];
    let spanStart = 0;
    for (let i = 1; i <= domain.length; i++) {
      if (i < domain.length && sameGroup(domain[i], domain[spanStart], level)) continue;
      runs.push({
        start: this.scale.convert(domain[spanStart]) - lead,
        end: this.scale.convert(domain[i - 1]) + this.scale.bandwidth,
        first: spanStart,
        last: i - 1,
        previousEnd: spanStart > 0 ? this.scale.convert(domain[spanStart - 1]) + this.scale.bandwidth : undefined,
      });
      spanStart = i;
    }
    return runs;
  }

  /** The runs of a row with their names — what the row draws. */
  private groupSpans(level: number): GroupSpan[] {
    return this.groupRuns(level).map((run) => ({
      ...run,
      text: this.formatGroup(levelValue(this.scale.domain[run.first], level), level, run.first, run.last),
    }));
  }

  /** Group name text: the axis formatter, its format string, or the value itself. */
  private formatGroup(value: unknown, level: number, start: number, end: number): string {
    const options = this.options.groupLabel;
    if (options?.formatter) return options.formatter({ value, level, start, end });
    if (value === undefined) return '';
    if (options?.format) return formatValue(options.format, value);
    return typeof value === 'number' ? formatAxisNumber(value) : String(value);
  }

  /** Group names share the tick-label size unless they ask for their own. */
  private get groupFontSize(): Pixels {
    return this.options.groupLabel?.fontSize ?? themeFont(this.env.theme, FONT_STEP.label);
  }

  private groupFont(): string {
    const groupLabel = this.options.groupLabel;
    return `${groupLabel?.fontWeight ?? 'bold'} ${this.groupFontSize}px ${groupLabel?.fontFamily ?? this.env.theme.fontFamily}`;
  }

  /**
   * Room a group name has: its own cap, and — when labels are cut rather than
   * thinned — the run of categories it stands over. The separators sit halfway
   * into the gaps outside that run, so a name held to it never touches one.
   */
  private groupRoom(span: GroupSpan): number {
    const maxWidth = this.options.groupLabel?.maxWidth;
    const cap = maxWidth !== undefined && maxWidth > 0 ? maxWidth : Infinity;
    return this.labelCuts ? Math.min(cap, Math.abs(span.end - span.start)) : cap;
  }

  /**
   * Group name as it is drawn: cut to the room the run leaves it, unless the cut
   * would eat the name itself. A run one category wide holds little more than
   * the mark, and a mark says nothing about which group it stands for — such a
   * name is drawn whole and its neighbours give way to it instead.
   */
  private groupText(span: GroupSpan, measureText: MeasureText): string {
    const room = this.groupRoom(span);
    if (!Number.isFinite(room) || !span.text) return span.text;
    const mark = this.options.label?.ellipsis ?? ELLIPSIS;
    const cut = ellipsize(span.text, this.groupFont(), room, measureText, mark);
    return cut.length > mark.length ? cut : span.text;
  }

  /**
   * The names one row draws: those that fit between their own separators. A name
   * wider than the run it stands over is dropped rather than drawn over the
   * group next door — the row thins, the way a row of tick labels does.
   */
  private drawnGroups(level: number, measureText: MeasureText): Array<{ text: string; center: number }> {
    const font = this.groupFont();
    const drawn: Array<{ text: string; center: number }> = [];
    for (const span of this.groupSpans(level)) {
      const text = this.groupText(span, measureText);
      if (!text) continue;
      const center = (span.start + span.end) / 2;
      const half = measureText(text, font) / 2;
      if (half * 2 > Math.abs(span.end - span.start)) continue;
      drawn.push({ text, center });
    }
    return drawn;
  }

  /**
   * A vertical axis reads its labels across, so the base class lets them all
   * through unless they sit inside the plot. Grouped categories thin either way:
   * a label belongs to its run here as much as it does on a horizontal axis.
   */
  protected override displayTicks(): Array<{ value: unknown; coord: number; index: number }> {
    const ticks = super.displayTicks();
    if (this.isHorizontal || this.labelsInside) return ticks;
    if (this.options.label?.avoidCollisions === false || this.options.label?.enabled === false) return ticks;
    return this.thinTicks(ticks, this.labelSize + LABEL_ROW_LEADING);
  }

  /**
   * Labels are thinned run by run, not across the axis as a whole: a run keeps
   * as many labels as fit between its own separators, taken from its middle
   * outwards. A label that would overhang its run reads as the neighbour's.
   */
  protected override thinTicks<T extends { value: unknown; coord: number; index: number }>(ticks: T[], labelExtent: number): T[] {
    const rows = this.groupRows;
    if (rows === 0 || ticks.length === 0 || labelExtent <= 0) return super.thinTicks(ticks, labelExtent);

    const kept: T[] = [];
    for (const run of this.groupRuns(rows - 1)) {
      const low = Math.min(run.start, run.end);
      const high = Math.max(run.start, run.end);
      const inside = ticks.filter(({ coord }) => coord >= low && coord <= high);
      if (inside.length === 0) continue;
      const count = Math.min(inside.length, Math.floor((high - low) / labelExtent));
      if (count === 0) {
        // no room for the widest label on the axis, but this run's own middle label may still fit
        const middle = inside[Math.round((inside.length - 1) / 2)]!;
        const half = this.tickWidth(middle, labelExtent) / 2;
        if (middle.coord - half >= low && middle.coord + half <= high) kept.push(middle);
        continue;
      }
      // evenly spread and centred on the run: one label lands in the middle, two sit either side of it
      for (let i = 0; i < count; i++) kept.push(inside[Math.round(((i + 0.5) * inside.length) / count - 0.5)]!);
    }
    return kept;
  }

  /** How much of the axis one label covers: its own width, or the row it sits in on a vertical axis. */
  private tickWidth(tick: { value: unknown; index: number }, fallback: number): number {
    if (!this.isHorizontal) return fallback;
    const text = this.tickLabel(tick.value, tick.index, this.labelMaxWidth, this.ownMeasureText);
    return this.measureWithCanvasFallback(text, this.labelFont());
  }

  override render(axisLayer: Group, gridLayer: Group, plot: LayoutRect, foregroundLayer?: Group): void {
    super.render(axisLayer, gridLayer, plot, foregroundLayer);
    const rows = this.groupRows;
    if (rows === 0) return;

    const horizontal = this.isHorizontal;
    const edge = horizontal
      ? this.position === 'bottom'
        ? plot.y + plot.height
        : plot.y
      : this.position === 'left'
        ? plot.x
        : plot.x + plot.width;
    const direction = this.position === 'bottom' || this.position === 'right' ? 1 : -1;
    const baseThickness = super.measure((text, font) => this.measureWithCanvasFallback(text, font));
    const groupLabel = this.options.groupLabel;
    // a boundary belongs to the outermost level that has it: one separator, as long as that row
    const separated = new Set<number>();

    for (let level = 0; level < rows; level++) {
      const rowCoord = edge + (baseThickness + this.rowOffset(level)) * direction;
      for (const { text, center } of this.drawnGroups(level, this.ownMeasureText)) {
        const label = new Text();
        label.text = text;
        label.textAlign = 'center';
        if (horizontal) {
          label.x = center;
          label.y = rowCoord;
          label.textBaseline = this.position === 'bottom' ? 'top' : 'bottom';
        } else {
          label.x = rowCoord;
          label.y = center;
          label.textBaseline = this.position === 'left' ? 'bottom' : 'top';
          label.rotation = -90;
        }
        label.fontSize = this.groupFontSize;
        label.fontWeight = groupLabel?.fontWeight !== undefined ? String(groupLabel.fontWeight) : 'bold';
        label.fontFamily = groupLabel?.fontFamily ?? this.env.theme.fontFamily;
        label.fill = groupLabel?.color ?? this.env.theme.foregroundColor;
        axisLayer.append(label);
      }

      // separators stand for the boundaries themselves: a run keeps its edges whether or not its name was drawn
      for (const run of this.groupRuns(level)) {
        if (run.previousEnd === undefined || separated.has(run.first)) continue;
        separated.add(run.first);
        const separator = new Line();
        // halfway into the gap between the runs — with inside labels the gap is the next group's, so this lands above them
        const sepCoord = (run.previousEnd + run.start) / 2;
        if (horizontal) {
          separator.x1 = separator.x2 = sepCoord;
          separator.y1 = edge;
          separator.y2 = rowCoord + SEPARATOR_OVERSHOOT * direction;
        } else {
          separator.y1 = separator.y2 = sepCoord;
          separator.x1 = edge;
          separator.x2 = rowCoord + SEPARATOR_OVERSHOOT * direction;
        }
        separator.stroke = this.env.theme.axisColor;
        axisLayer.append(separator);
      }
    }
  }
}

/** The tuple element a row is built from; a value that has no such level has none. */
function levelValue(value: unknown, level: number): unknown {
  return Array.isArray(value) && level < value.length - 1 ? value[level] : undefined;
}

/** Same group at `level`: every level down to it matches, by value rather than by text. */
function sameGroup(a: unknown, b: unknown, level: number): boolean {
  for (let i = 0; i <= level; i++) if (!sameValue(levelValue(a, i), levelValue(b, i))) return false;
  return true;
}

/** Dates are compared by their time, the way the band scale compares them. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return Object.is(a, b);
}

export const groupedCategoryAxisModule: AxisModule<GroupedCategoryAxisOptions> = {
  kind: 'axis',
  type: 'grouped-category',
  create: (options, env) => new GroupedCategoryAxis(options, env),
};
