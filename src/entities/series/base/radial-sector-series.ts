import { PolarSeries, type PolarSeriesBaseOptions, type RadialTooltipRendererParams } from './polar-series';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { LegendItemDescriptor, PolarRenderContext, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, Switchable } from '@/shared/options';
import { groupSlot } from '@/shared/scale';
import { Group, Sector } from '@/shared/scene';
import { extent, tooltipContentOf } from '@/shared/util';

export interface RadialSectorSeriesBaseOptions extends PolarSeriesBaseOptions {
  angleField: string;
  radiusField: string;
  name?: string;
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  /**
   * Gap between sectors of one angle group (radial-column) — fraction of the
   * slot step (0–0.9, default 0.2). Ignored when the series is alone in the band.
   */
  groupGap?: Fraction;
  /** Constant-width gap between adjacent sectors, px (1 by default). */
  sectorSpacing?: Pixels;
  tooltip?: Switchable & {
    renderer?: (params: RadialTooltipRendererParams) => TooltipContentData | string;
  };
}

interface SectorGeometry {
  index: number;
  startAngle: number;
  endAngle: number;
  outerRadius: number;
}

/** Base for sector-based radial series (nightingale, radial-column). */
export abstract class RadialSectorSeries<O extends RadialSectorSeriesBaseOptions = RadialSectorSeriesBaseOptions> extends PolarSeries<O> {
  private sectors: SectorGeometry[] = [];
  private center = { x: 0, y: 0 };

  /** Whether the series shares a band with other series (radial-column) or takes it entirely. */
  protected abstract usesGroupSlot(): boolean;

  override occupiesAngleSlot(): boolean {
    return this.usesGroupSlot();
  }

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  protected get seriesName(): string {
    return this.options.name ?? this.options.radiusField;
  }

  override angleValues(data: Datum[]): unknown[] {
    return data.map((datum) => datum[this.options.angleField]);
  }

  override radiusDomain(data: Datum[]): [number, number] | undefined {
    const domain = extent(numericValues(data, this.options.radiusField));
    if (!domain) return undefined;
    return [Math.min(0, domain[0]), Math.max(0, domain[1])];
  }

  update(ctx: PolarRenderContext): void {
    this.lastCtx = ctx;
    this.sectors = [];
    if (!this.visible || !ctx.angleScale || !ctx.radiusScale) return;
    const { data, centerX, centerY, angleScale, radiusScale } = ctx;
    this.center = { x: centerX, y: centerY };
    const values = numericValues(data, this.options.radiusField);
    const t = ctx.animationT ?? 1;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;

    const slot = groupSlot(angleScale.bandwidth, this.usesGroupSlot() ? ctx.group : undefined, this.options.groupGap);

    const group = new Group();
    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value) || value <= 0) return;
      const bandStart = angleScale.convert(datum[this.options.angleField]);
      if (Number.isNaN(bandStart)) return;
      const startAngle = bandStart + slot.start;
      const endAngle = startAngle + slot.size;
      const outerRadius = radiusScale.convert(value) * t;
      this.sectors.push({ index, startAngle, endAngle, outerRadius });

      const node = new Sector();
      node.centerX = centerX;
      node.centerY = centerY;
      node.innerRadius = 0;
      node.outerRadius = outerRadius;
      node.startAngle = startAngle;
      node.endAngle = endAngle;
      node.edgeInset = (this.options.sectorSpacing ?? 1) / 2;
      node.fill = this.mainColor();
      node.opacity = this.options.fillOpacity ?? this.env.theme.fillOpacity ?? 0.85;
      const isSelected = ctx.selected?.has(index) === true;
      node.stroke = isSelected ? (ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor) : this.options.stroke;
      node.strokeWidth = isSelected
        ? (ctx.selectionStyle?.strokeWidth ?? 1.5)
        : index === highlighted
          ? 1.5
          : (this.options.strokeWidth ?? this.env.theme.markStrokeWidth ?? 1);
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
    for (const sector of this.sectors) {
      if (radius > sector.outerRadius) continue;
      let a = angle;
      while (a < sector.startAngle) a += Math.PI * 2;
      if (a >= sector.startAngle && a <= sector.endAngle) {
        const mid = (sector.startAngle + sector.endAngle) / 2;
        const anchor = PolarSeries.pointAt(this.center.x, this.center.y, mid, sector.outerRadius);
        return { seriesId: this.id, datumIndex: sector.index, distance: 0, x: anchor.x, y: anchor.y };
      }
    }
    return undefined;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const sector = this.sectors.find((candidate) => candidate.index === datumIndex);
    if (!sector) return undefined;
    const mid = (sector.startAngle + sector.endAngle) / 2;
    const anchor = PolarSeries.pointAt(this.center.x, this.center.y, mid, sector.outerRadius);
    return { seriesId: this.id, datumIndex, distance: 0, x: anchor.x, y: anchor.y };
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
          color: this.mainColor(),
        }),
      );
    }
    return {
      heading: String(datum[this.options.angleField]),
      rows: [{ label: this.seriesName, value: String(datum[this.options.radiusField]), color: this.mainColor() }],
    };
  }

  legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    return [{ seriesId: this.id, label: this.seriesName, color: this.mainColor(), visible: this.visible }];
  }
}
