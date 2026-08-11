import { StandaloneSeries, type StandaloneSeriesBaseOptions } from '@/entities/series/base';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { LegendItemDescriptor, SeriesModule, SeriesPick, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Sector, Text } from '@/shared/scene';
import { contrastTextColor } from '@/shared/util';

export interface SunburstSeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'sunburst';
  labelField?: string;
  sizeField?: string;
  childrenField?: string;
  /** Constant-width gap between sectors (px), same as pie. */
  sectorSpacing?: Pixels;
  /** Sector corner radius. */
  cornerRadius?: Pixels;
  /** Sector stroke (by default a 1px background-colored stroke when sectorSpacing is zero). */
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  /** Sector labels (disabled by default; color is auto-contrast). */
  label?: Switchable &
    FontOptions & {
      formatter?: (params: { label: string; value: number; depth: number }) => string;
    };
}

interface SunNode {
  label: string;
  value: number;
  depth: number;
  branchIndex: number;
  children: SunNode[];
  /** The row the node was read from — what an event about the node carries. */
  meta: Datum;
}

interface SectorGeometry {
  index: number;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
}

export class SunburstSeries extends StandaloneSeries<SunburstSeriesOptions> {
  readonly type = 'sunburst';
  private nodes: SunNode[] = [];
  private sectors: SectorGeometry[] = [];
  private center = { x: 0, y: 0 };

  private parse(data: Datum[]): SunNode[] {
    const labelField = this.options.labelField ?? 'label';
    const sizeField = this.options.sizeField ?? 'size';
    const childrenField = this.options.childrenField ?? 'children';
    const walk = (items: Datum[], depth: number, branchIndex: number): SunNode[] =>
      items.map((item, index) => {
        const childItems = item[childrenField];
        const children = Array.isArray(childItems) ? walk(childItems as Datum[], depth + 1, depth === 0 ? index : branchIndex) : [];
        const own = Number(item[sizeField]);
        const value = children.length > 0 ? children.reduce((sum, child) => sum + child.value, 0) : Number.isNaN(own) ? 0 : own;
        return {
          label: String(item[labelField] ?? index),
          value,
          depth,
          branchIndex: depth === 0 ? index : branchIndex,
          children,
          meta: item,
        };
      });
    return walk(data, 0, 0);
  }

  private maxDepth(nodes: SunNode[]): number {
    let max = 0;
    for (const node of nodes) {
      max = Math.max(max, 1 + (node.children.length > 0 ? this.maxDepth(node.children) : 0));
    }
    return max;
  }

  update(ctx: StandaloneRenderContext): void {
    this.lastCtx = ctx;
    this.nodes = [];
    this.sectors = [];
    if (!this.visible) return;
    const roots = this.parse(ctx.data);
    const total = roots.reduce((sum, node) => sum + node.value, 0);
    if (total <= 0) return;

    const { plot } = ctx;
    const centerX = plot.x + plot.width / 2;
    const centerY = plot.y + plot.height / 2;
    this.center = { x: centerX, y: centerY };
    const radius = Math.min(plot.width, plot.height) / 2 - 4;
    const depthCount = this.maxDepth(roots);
    const ringWidth = radius / (depthCount + 0.4);
    const t = ctx.animationT ?? 1;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;
    const group = new Group();

    const renderLevel = (items: SunNode[], startAngle: number, sweep: number, depth: number) => {
      const levelTotal = items.reduce((sum, item) => sum + item.value, 0);
      if (levelTotal <= 0) return;
      let cursor = startAngle;
      for (const node of items) {
        const nodeSweep = (node.value / levelTotal) * sweep;
        const nodeIndex = this.nodes.length;
        this.nodes.push(node);
        const geometry: SectorGeometry = {
          index: nodeIndex,
          startAngle: cursor,
          endAngle: cursor + nodeSweep * t,
          innerRadius: depth === 0 ? ringWidth * 0.4 : ringWidth * 0.4 + ringWidth * depth,
          outerRadius: ringWidth * 0.4 + ringWidth * (depth + 1) - 1,
        };
        this.sectors.push(geometry);

        const sector = new Sector();
        sector.centerX = centerX;
        sector.centerY = centerY;
        sector.innerRadius = geometry.innerRadius;
        sector.outerRadius = geometry.outerRadius;
        sector.startAngle = geometry.startAngle;
        sector.endAngle = geometry.endAngle;
        sector.fill = this.colorFor(node.branchIndex);
        sector.opacity = Math.max(0.35, 1 - depth * 0.22);
        const spacing = this.options.sectorSpacing ?? 0;
        sector.edgeInset = spacing / 2;
        sector.cornerRadius = this.options.cornerRadius ?? this.env.theme.cornerRadius ?? 0;
        sector.stroke = this.options.stroke ?? (spacing > 0 ? undefined : this.env.theme.backgroundColor);
        sector.strokeWidth = this.options.strokeWidth ?? this.env.theme.markStrokeWidth ?? 1;
        if (nodeIndex === highlighted) {
          sector.opacity = 1;
        }
        group.append(sector);

        if (this.options.label?.enabled === true) {
          const midAngle = (geometry.startAngle + geometry.endAngle) / 2;
          const midRadius = (geometry.innerRadius + geometry.outerRadius) / 2;
          const arcLength = (geometry.endAngle - geometry.startAngle) * midRadius;
          const ring = geometry.outerRadius - geometry.innerRadius;
          if (arcLength > 26 && ring > 13) {
            const labelOptions = this.options.label;
            const text = new Text();
            text.text = labelOptions.formatter ? labelOptions.formatter({ label: node.label, value: node.value, depth }) : node.label;
            text.x = centerX + Math.sin(midAngle) * midRadius;
            text.y = centerY - Math.cos(midAngle) * midRadius;
            text.textAlign = 'center';
            text.textBaseline = 'middle';
            text.fontSize = labelOptions.fontSize ?? themeFont(this.env.theme, FONT_STEP.label);
            text.fontWeight = labelOptions.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
            text.fontFamily = labelOptions.fontFamily ?? this.env.theme.fontFamily;
            text.fill = labelOptions.color ?? contrastTextColor(this.colorFor(node.branchIndex));
            text.outline = this.colorFor(node.branchIndex);
            group.append(text);
          }
        }

        if (node.children.length > 0) {
          renderLevel(node.children, cursor, nodeSweep, depth + 1);
        }
        cursor += nodeSweep;
      }
    };
    renderLevel(roots, 0, Math.PI * 2, 0);
    ctx.layer.append(group);
  }

  override pick(x: number, y: number): SeriesPick | undefined {
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const radius = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    // deeper sectors are checked first
    for (let i = this.sectors.length - 1; i >= 0; i--) {
      const sector = this.sectors[i];
      if (!sector) continue;
      if (radius < sector.innerRadius || radius > sector.outerRadius) continue;
      if (angle >= sector.startAngle && angle <= sector.endAngle) {
        const mid = (sector.startAngle + sector.endAngle) / 2;
        return {
          seriesId: this.id,
          datumIndex: sector.index,
          distance: 0,
          x: this.center.x + Math.sin(mid) * sector.outerRadius * 0.9,
          y: this.center.y - Math.cos(mid) * sector.outerRadius * 0.9,
        };
      }
    }
    return undefined;
  }

  override nodeAt(datumIndex: number): SeriesPick | undefined {
    const sector = this.sectors.find((candidate) => candidate.index === datumIndex);
    if (!sector) return undefined;
    const mid = (sector.startAngle + sector.endAngle) / 2;
    return {
      seriesId: this.id,
      datumIndex,
      distance: 0,
      x: this.center.x + Math.sin(mid) * sector.outerRadius * 0.9,
      y: this.center.y - Math.cos(mid) * sector.outerRadius * 0.9,
    };
  }

  /** The row a sector came from: nested nodes are numbered too, so an index is not a row. */
  override datumAt(datumIndex: number): Datum | undefined {
    return this.nodes[datumIndex]?.meta;
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const node = this.nodes[datumIndex];
    if (!node) return { rows: [] };
    const total = this.nodes.filter((candidate) => candidate.depth === 0).reduce((sum, root) => sum + root.value, 0);
    return this.nodeTooltip({
      datum: node.meta,
      label: node.label,
      value: node.value,
      share: total > 0 ? node.value / total : undefined,
      valueField: this.options.sizeField ?? 'size',
      color: this.colorFor(node.branchIndex),
    });
  }

  override legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    return this.parse(this.data).map((node, index) => ({
      seriesId: `${this.id}#${index}`,
      label: node.label,
      color: this.colorFor(index),
      visible: true,
    }));
  }
}

export const sunburstSeriesModule: SeriesModule<SunburstSeriesOptions> = {
  kind: 'series',
  type: 'sunburst',
  chartKind: 'hierarchy',
  create: (options, env) => new SunburstSeries(options, env),
};
