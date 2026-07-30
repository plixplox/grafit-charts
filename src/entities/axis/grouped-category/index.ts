import { BaseAxis, type AxisBaseOptions } from '@/entities/axis/base';
import type { AxisModule, LayoutRect } from '@/shared/kernel';
import type { Pixels } from '@/shared/options';
import { BandScale } from '@/shared/scale';
import { Group, Line, Text } from '@/shared/scene';

export interface GroupedCategoryAxisOptions extends AxisBaseOptions {
  type: 'grouped-category';
  paddingInner?: number;
  paddingOuter?: number;
  /** Gap between the item labels and the group row, px. */
  groupSpacing?: Pixels;
}

const GROUP_ROW_HEIGHT = 16;
const GROUP_SPACING = 8;

/**
 * Hierarchical categories: data values are [group, item] arrays.
 * Item labels are drawn by the base class; the group row is added below.
 */
export class GroupedCategoryAxis extends BaseAxis<GroupedCategoryAxisOptions> {
  readonly type = 'grouped-category';
  readonly scale = new BandScale<unknown>();

  setDomain(domain: unknown[]): void {
    this.scale.domain = domain;
    this.scale.paddingInner = this.options.paddingInner ?? 0.2;
    this.scale.paddingOuter = this.options.paddingOuter ?? 0.1;
  }

  layout(plot: LayoutRect): void {
    this.layoutBandScale(this.scale, plot, this.options.paddingInner);
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

  override measure(measureText: (text: string, font: string) => number): number {
    return super.measure(measureText) + (this.hasGroups() ? this.groupSpacing() + GROUP_ROW_HEIGHT : 0);
  }

  private groupSpacing(): number {
    return this.options.groupSpacing ?? GROUP_SPACING;
  }

  private hasGroups(): boolean {
    return this.scale.domain.some((value) => Array.isArray(value) && value.length > 1);
  }

  override render(axisLayer: Group, gridLayer: Group, plot: LayoutRect, foregroundLayer?: Group): void {
    super.render(axisLayer, gridLayer, plot, foregroundLayer);
    if (!this.hasGroups()) return;

    // group row: contiguous runs with the same first element
    const domain = this.scale.domain;
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

    let spanStart = 0;
    const groupOf = (value: unknown) => (Array.isArray(value) ? String(value[0]) : '');
    for (let i = 1; i <= domain.length; i++) {
      if (i < domain.length && groupOf(domain[i]) === groupOf(domain[spanStart])) continue;
      const first = domain[spanStart];
      const last = domain[i - 1];
      const c0 = this.scale.convert(first);
      const c1 = this.scale.convert(last) + this.scale.bandwidth;
      const label = new Text();
      label.text = groupOf(first);
      label.textAlign = 'center';
      if (horizontal) {
        label.x = (c0 + c1) / 2;
        label.y = rowCoord;
        label.textBaseline = this.position === 'bottom' ? 'top' : 'bottom';
      } else {
        label.x = rowCoord;
        label.y = (c0 + c1) / 2;
        label.textBaseline = this.position === 'left' ? 'bottom' : 'top';
        label.rotation = -90;
      }
      label.fontSize = 11;
      label.fontWeight = 'bold';
      label.fontFamily = this.env.theme.fontFamily;
      label.fill = this.env.theme.foregroundColor;
      axisLayer.append(label);

      if (spanStart > 0) {
        const separator = new Line();
        const previousEnd = this.scale.convert(domain[spanStart - 1]) + this.scale.bandwidth;
        // inside labels sit in the gap, so the separator goes above them instead of through them
        const sepCoord = !horizontal && this.labelsInside ? previousEnd : (previousEnd + c0) / 2;
        if (horizontal) {
          separator.x1 = separator.x2 = sepCoord;
          separator.y1 = edge;
          separator.y2 = rowCoord + 10 * direction;
        } else {
          separator.y1 = separator.y2 = sepCoord;
          separator.x1 = edge;
          separator.x2 = rowCoord + 10 * direction;
        }
        separator.stroke = this.env.theme.mutedColor;
        separator.opacity = 0.5;
        axisLayer.append(separator);
      }
      spanStart = i;
    }
  }
}

export const groupedCategoryAxisModule: AxisModule<GroupedCategoryAxisOptions> = {
  kind: 'axis',
  type: 'grouped-category',
  create: (options, env) => new GroupedCategoryAxis(options, env),
};
