import { BaseAxis, type AxisBaseOptions } from '@/entities/axis/base';
import type { AxisModule, LayoutRect } from '@/shared/kernel';
import { BandScale } from '@/shared/scale';
import { Group, Line, Text } from '@/shared/scene';

export interface GroupedCategoryAxisOptions extends AxisBaseOptions {
  type: 'grouped-category';
  paddingInner?: number;
  paddingOuter?: number;
}

const GROUP_ROW_HEIGHT = 16;

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
    this.scale.range = this.isHorizontal ? [plot.x, plot.x + plot.width] : [plot.y, plot.y + plot.height];
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
    return super.measure(measureText) + (this.hasGroups() ? GROUP_ROW_HEIGHT : 0);
  }

  private hasGroups(): boolean {
    return this.scale.domain.some((value) => Array.isArray(value) && value.length > 1);
  }

  override render(axisLayer: Group, gridLayer: Group, plot: LayoutRect): void {
    super.render(axisLayer, gridLayer, plot);
    if (!this.hasGroups() || !this.isHorizontal) return;

    // group row: contiguous runs with the same first element
    const domain = this.scale.domain;
    const edge = this.position === 'bottom' ? plot.y + plot.height : plot.y;
    const direction = this.position === 'bottom' ? 1 : -1;
    const baseThickness = super.measure((text, font) => this.approxMeasure(text, font));
    const rowY = edge + (baseThickness + 2) * direction;

    let spanStart = 0;
    const groupOf = (value: unknown) => (Array.isArray(value) ? String(value[0]) : '');
    for (let i = 1; i <= domain.length; i++) {
      if (i < domain.length && groupOf(domain[i]) === groupOf(domain[spanStart])) continue;
      const first = domain[spanStart];
      const last = domain[i - 1];
      const x0 = this.scale.convert(first);
      const x1 = this.scale.convert(last) + this.scale.bandwidth;
      const label = new Text();
      label.text = groupOf(first);
      label.x = (x0 + x1) / 2;
      label.y = rowY;
      label.textAlign = 'center';
      label.textBaseline = this.position === 'bottom' ? 'top' : 'bottom';
      label.fontSize = 11;
      label.fontWeight = 'bold';
      label.fontFamily = this.env.theme.fontFamily;
      label.fill = this.env.theme.foregroundColor;
      axisLayer.append(label);

      if (spanStart > 0) {
        const separator = new Line();
        separator.x1 = separator.x2 = (this.scale.convert(domain[spanStart - 1]) + this.scale.bandwidth + x0) / 2;
        separator.y1 = edge;
        separator.y2 = rowY + 10 * direction;
        separator.stroke = this.env.theme.mutedColor;
        separator.opacity = 0.5;
        axisLayer.append(separator);
      }
      spanStart = i;
    }
  }

  private approxMeasure(text: string, font: string): number {
    const fontSize = Number.parseFloat(font) || 11;
    return text.length * fontSize * 0.6;
  }
}

export const groupedCategoryAxisModule: AxisModule<GroupedCategoryAxisOptions> = {
  kind: 'axis',
  type: 'grouped-category',
  create: (options, env) => new GroupedCategoryAxis(options, env),
};
