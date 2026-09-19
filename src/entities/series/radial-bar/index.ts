import {
  PolarSeries,
  styleRectItem,
  type PolarSeriesBaseOptions,
  type RadialTooltipRendererParams,
  type SectorItemStyle,
  type SectorItemStylerParams,
} from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { LegendItemDescriptor, PolarRenderContext, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, Styler, Switchable } from '@/shared/options';
import { Group, Sector } from '@/shared/scene';
import { extent, tooltipContentOf } from '@/shared/util';

export interface RadialBarSeriesOptions extends PolarSeriesBaseOptions {
  type: 'radial-bar';
  angleField: string;
  radiusField: string;
  name?: string;
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  /**
   * Style of one bar by its datum. Undefined leaves the bar as it is; a
   * partial style is laid over it. The legend keeps the series color.
   */
  itemStyler?: Styler<SectorItemStylerParams, SectorItemStyle>;
  tooltip?: Switchable & {
    renderer?: (params: RadialTooltipRendererParams) => TooltipContentData | string;
  };
}

interface BarGeometry {
  index: number;
  innerRadius: number;
  outerRadius: number;
  sweep: number;
}

/** Polar bar: category along the radius (rings), value as an angular arc. */
export class RadialBarSeries extends PolarSeries<RadialBarSeriesOptions> {
  readonly type = 'radial-bar';
  private bars: BarGeometry[] = [];
  private center = { x: 0, y: 0 };

  polarLayout(): 'radius-category' {
    return 'radius-category';
  }

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  /** How the item styler paints a bar, in the state it is in. */
  private itemStyle(index: number, datum: Datum, highlighted: boolean): SectorItemStyle {
    return styleRectItem(this.options.itemStyler, { datum, index, highlighted, fill: this.mainColor(), stroke: this.options.stroke });
  }

  /** Color of a datum for its tooltip: the styled bar's, the series' otherwise. */
  private itemColor(index: number, datum: Datum): ColorValue {
    return this.itemStyle(index, datum, false).fill ?? this.mainColor();
  }

  protected get seriesName(): string {
    return this.options.name ?? this.options.radiusField;
  }

  override angleValues(data: Datum[]): unknown[] {
    // categories (along the radius) are collected via the same angleValues channel
    return data.map((datum) => datum[this.options.angleField]);
  }

  override valueFields(): string[] {
    return [this.options.radiusField];
  }

  override radiusDomain(data: Datum[]): [number, number] | undefined {
    const domain = extent(numericValues(data, this.options.radiusField));
    if (!domain) return undefined;
    return [Math.min(0, domain[0]), Math.max(0, domain[1])];
  }

  update(ctx: PolarRenderContext): void {
    this.lastCtx = ctx;
    this.bars = [];
    if (!this.visible || !ctx.radiusBandScale || !ctx.angleValueScale) return;
    const { data, centerX, centerY, radiusBandScale, angleValueScale } = ctx;
    this.center = { x: centerX, y: centerY };
    const values = numericValues(data, this.options.radiusField);
    const t = ctx.animationT ?? 1;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;
    const group = new Group();

    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value) || value <= 0) return;
      const bandStart = radiusBandScale.convert(datum[this.options.angleField]);
      if (Number.isNaN(bandStart)) return;
      const thickness = radiusBandScale.bandwidth;
      const sweep = angleValueScale.convert(value) * t;
      const geometry: BarGeometry = {
        index,
        innerRadius: bandStart,
        outerRadius: bandStart + thickness,
        sweep,
      };
      this.bars.push(geometry);

      const node = new Sector();
      node.centerX = centerX;
      node.centerY = centerY;
      node.innerRadius = geometry.innerRadius;
      node.outerRadius = geometry.outerRadius;
      node.startAngle = 0;
      node.endAngle = sweep;
      const item = this.itemStyle(index, datum, index === highlighted);
      node.fill = item.fill ?? this.mainColor();
      node.opacity = item.fillOpacity ?? this.options.fillOpacity ?? this.env.theme.fillOpacity ?? 0.9;
      const isSelected = ctx.selected?.has(index) === true;
      // the selection outline wins over the styler's: it is what shows the bar is selected
      node.stroke = isSelected ? (ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor) : (item.stroke ?? this.options.stroke);
      node.strokeWidth = isSelected
        ? (ctx.selectionStyle?.strokeWidth ?? 1.5)
        : (item.strokeWidth ?? (index === highlighted ? 1.5 : (this.options.strokeWidth ?? this.env.theme.markStrokeWidth ?? 1)));
      if (ctx.selectionActive && !isSelected) node.opacity *= ctx.selectionStyle?.inactiveOpacity ?? 0.45;
      group.append(node);
    });

    if (ctx.highlight && !ctx.highlight.allSeries && ctx.highlight.seriesId !== this.id) {
      group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    }
    ctx.layer.append(group);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const radius = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    for (const bar of this.bars) {
      if (radius < bar.innerRadius || radius > bar.outerRadius) continue;
      if (angle <= bar.sweep) {
        const mid = bar.sweep / 2;
        const r = (bar.innerRadius + bar.outerRadius) / 2;
        return {
          seriesId: this.id,
          datumIndex: bar.index,
          distance: 0,
          x: this.center.x + Math.sin(mid) * r,
          y: this.center.y - Math.cos(mid) * r,
        };
      }
    }
    return undefined;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const bar = this.bars.find((candidate) => candidate.index === datumIndex);
    if (!bar) return undefined;
    const mid = bar.sweep / 2;
    const r = (bar.innerRadius + bar.outerRadius) / 2;
    return {
      seriesId: this.id,
      datumIndex,
      distance: 0,
      x: this.center.x + Math.sin(mid) * r,
      y: this.center.y - Math.cos(mid) * r,
    };
  }

  tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.data[datumIndex];
    if (!datum) return { rows: [] };
    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      return tooltipContentOf(
        renderer({
          datum,
          label: String(datum[this.options.angleField]),
          value: datum[this.options.radiusField],
          seriesName: this.seriesName,
          color: this.itemColor(datumIndex, datum),
        }),
      );
    }
    return {
      heading: String(datum[this.options.angleField]),
      rows: [{ label: this.seriesName, value: String(datum[this.options.radiusField]), color: this.itemColor(datumIndex, datum) }],
    };
  }

  legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    return [{ seriesId: this.id, label: this.seriesName, color: this.mainColor(), visible: this.visible }];
  }
}

export const radialBarSeriesModule: SeriesModule<RadialBarSeriesOptions> = {
  kind: 'series',
  type: 'radial-bar',
  requiredOptions: ['angleField', 'radiusField'],
  chartKind: 'polar',
  create: (options, env) => new RadialBarSeries(options, env),
};
