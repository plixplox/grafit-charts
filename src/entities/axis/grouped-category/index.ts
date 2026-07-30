import { BaseAxis, DEFAULT_PADDING_INNER, DEFAULT_PADDING_OUTER, type AxisBaseOptions } from '@/entities/axis/base';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { AxisModule, Insets, LayoutRect, MeasureText } from '@/shared/kernel';
import type { Pixels } from '@/shared/options';
import { BandScale } from '@/shared/scale';
import { Group, Line, Text } from '@/shared/scene';
import { maxOverflow, overflowOutside } from '@/shared/util';

export interface GroupedCategoryAxisOptions extends AxisBaseOptions {
  type: 'grouped-category';
  paddingInner?: number;
  paddingOuter?: number;
  /** Gap between categories in px; takes precedence over `paddingInner`. */
  gap?: Pixels;
  /** Gap between the item labels and the group row, px. */
  groupSpacing?: Pixels;
}

const GROUP_ROW_HEIGHT = 16;
const GROUP_SPACING = 8;
/** How far the separator between groups runs past the group row. */
const SEPARATOR_OVERSHOOT = 10;

/**
 * Hierarchical categories: data values are [group, item] arrays.
 * Item labels are drawn by the base class; the group row is added below.
 */
export class GroupedCategoryAxis extends BaseAxis<GroupedCategoryAxisOptions> {
  readonly type = 'grouped-category';
  readonly scale = new BandScale<unknown>();

  setDomain(domain: unknown[]): void {
    this.scale.domain = domain;
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

  override measure(measureText: MeasureText): number {
    return super.measure(measureText) + (this.hasGroups() ? this.groupSpacing() + GROUP_ROW_HEIGHT : 0);
  }

  private groupSpacing(): number {
    return this.options.groupSpacing ?? GROUP_SPACING;
  }

  private hasGroups(): boolean {
    return this.scale.domain.some((value) => Array.isArray(value) && value.length > 1);
  }

  /** Group row: contiguous runs of categories sharing the first element. */
  private groupSpans(): Array<{ text: string; start: number; end: number; previousEnd?: number }> {
    const domain = this.scale.domain;
    const groupOf = (value: unknown) => (Array.isArray(value) ? String(value[0]) : '');
    const spans: Array<{ text: string; start: number; end: number; previousEnd?: number }> = [];
    let spanStart = 0;
    for (let i = 1; i <= domain.length; i++) {
      if (i < domain.length && groupOf(domain[i]) === groupOf(domain[spanStart])) continue;
      spans.push({
        text: groupOf(domain[spanStart]),
        start: this.scale.convert(domain[spanStart]),
        end: this.scale.convert(domain[i - 1]) + this.scale.bandwidth,
        previousEnd: spanStart > 0 ? this.scale.convert(domain[spanStart - 1]) + this.scale.bandwidth : undefined,
      });
      spanStart = i;
    }
    return spans;
  }

  /** Group names share the tick-label size. */
  private get groupFontSize(): Pixels {
    return themeFont(this.env.theme, FONT_STEP.label);
  }

  private groupFont(): string {
    return `bold ${this.groupFontSize}px ${this.env.theme.fontFamily}`;
  }

  /**
   * The group name is centred over its run of categories, so the outermost
   * groups can reach past the plot the same way tick labels do. On a vertical
   * axis the name is turned on its side, so its width becomes its height.
   */
  override labelOverflow(measureText: MeasureText, plot: LayoutRect): Insets {
    let overflow = super.labelOverflow(measureText, plot);
    if (!this.hasGroups()) return overflow;
    const font = this.groupFont();
    for (const span of this.groupSpans()) {
      const center = (span.start + span.end) / 2;
      const half = measureText(span.text, font) / 2;
      const bounds = this.isHorizontal
        ? { left: center - half, right: center + half, top: plot.y, bottom: plot.y + plot.height }
        : { left: plot.x, right: plot.x + plot.width, top: center - half, bottom: center + half };
      overflow = maxOverflow(overflow, overflowOutside(bounds, plot));
    }
    return overflow;
  }

  override render(axisLayer: Group, gridLayer: Group, plot: LayoutRect, foregroundLayer?: Group): void {
    super.render(axisLayer, gridLayer, plot, foregroundLayer);
    if (!this.hasGroups()) return;

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
    const rowCoord = edge + (baseThickness + this.groupSpacing()) * direction;

    for (const span of this.groupSpans()) {
      const label = new Text();
      label.text = span.text;
      label.textAlign = 'center';
      if (horizontal) {
        label.x = (span.start + span.end) / 2;
        label.y = rowCoord;
        label.textBaseline = this.position === 'bottom' ? 'top' : 'bottom';
      } else {
        label.x = rowCoord;
        label.y = (span.start + span.end) / 2;
        label.textBaseline = this.position === 'left' ? 'bottom' : 'top';
        label.rotation = -90;
      }
      label.fontSize = this.groupFontSize;
      label.fontWeight = 'bold';
      label.fontFamily = this.env.theme.fontFamily;
      label.fill = this.env.theme.foregroundColor;
      axisLayer.append(label);

      if (span.previousEnd !== undefined) {
        const separator = new Line();
        // inside labels sit in the gap, so the separator goes above them instead of through them
        const sepCoord = !horizontal && this.labelsInside ? span.previousEnd : (span.previousEnd + span.start) / 2;
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

export const groupedCategoryAxisModule: AxisModule<GroupedCategoryAxisOptions> = {
  kind: 'axis',
  type: 'grouped-category',
  create: (options, env) => new GroupedCategoryAxis(options, env),
};
