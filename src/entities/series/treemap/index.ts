import { StandaloneSeries, type StandaloneSeriesBaseOptions } from '@/entities/series/base';
import type { LegendItemDescriptor, SeriesModule, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type { Datum, FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Rect, Text } from '@/shared/scene';
import { contrastTextColor } from '@/shared/util';

export interface TreemapSeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'treemap';
  labelField?: string;
  sizeField?: string;
  childrenField?: string;
  /** Group header height. */
  groupHeaderHeight?: number;
  /** Gap between tiles (2 by default). */
  itemPadding?: Pixels;
  /** Tile labels (enabled by default, color is auto-contrast). */
  label?: Switchable &
    FontOptions & {
      /** Placement within the tile (center by default). */
      placement?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      formatter?: (params: { datum: Datum; label: string; value: number }) => string;
    };
}

interface TreeNode {
  label: string;
  value: number;
  depth: number;
  branchIndex: number;
  children: TreeNode[];
  meta: Datum;
}

interface RectArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class TreemapSeries extends StandaloneSeries<TreemapSeriesOptions> {
  readonly type = 'treemap';
  private nodes: TreeNode[] = [];

  private get labelField(): string {
    return this.options.labelField ?? 'label';
  }

  private parse(data: Datum[]): TreeNode[] {
    const sizeField = this.options.sizeField ?? 'size';
    const childrenField = this.options.childrenField ?? 'children';
    const walk = (items: Datum[], depth: number, branchIndex: number): TreeNode[] =>
      items.map((item, index) => {
        const childItems = item[childrenField];
        const children = Array.isArray(childItems) ? walk(childItems as Datum[], depth + 1, depth === 0 ? index : branchIndex) : [];
        const own = Number(item[sizeField]);
        const value = children.length > 0 ? children.reduce((sum, child) => sum + child.value, 0) : Number.isNaN(own) ? 0 : own;
        return {
          label: String(item[this.labelField] ?? index),
          value,
          depth,
          branchIndex: depth === 0 ? index : branchIndex,
          children,
          meta: item,
        };
      });
    return walk(data, 0, 0);
  }

  /** Classic squarify: rows minimizing the worst aspect ratio. */
  private squarify(items: TreeNode[], rect: RectArea): Array<{ node: TreeNode; rect: RectArea }> {
    const result: Array<{ node: TreeNode; rect: RectArea }> = [];
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0 || rect.width <= 0 || rect.height <= 0) return result;
    const scale = (rect.width * rect.height) / total;
    const rest = [...items].sort((a, b) => b.value - a.value);
    let area: RectArea = { ...rect };

    while (rest.length > 0) {
      const row: TreeNode[] = [];
      const side = Math.min(area.width, area.height);
      let rowArea = 0;
      let worst = Infinity;
      while (rest.length > 0) {
        const candidate = rest[0]!;
        const candidateArea = candidate.value * scale;
        const nextRowArea = rowArea + candidateArea;
        const lengths = [...row, candidate].map((node) => node.value * scale);
        const maxLen = Math.max(...lengths);
        const minLen = Math.min(...lengths);
        const rowThickness = nextRowArea / side;
        const nextWorst = Math.max(maxLen / rowThickness / rowThickness, rowThickness / (minLen / rowThickness));
        if (nextWorst > worst && row.length > 0) break;
        row.push(rest.shift()!);
        rowArea = nextRowArea;
        worst = nextWorst;
      }
      const horizontal = area.width >= area.height;
      const thickness = rowArea / side;
      let offset = 0;
      for (const node of row) {
        const length = (node.value * scale) / thickness;
        const tile: RectArea = horizontal
          ? { x: area.x, y: area.y + offset, width: thickness, height: length }
          : { x: area.x + offset, y: area.y, width: length, height: thickness };
        result.push({ node, rect: tile });
        offset += length;
      }
      if (horizontal) {
        area = { x: area.x + thickness, y: area.y, width: area.width - thickness, height: area.height };
      } else {
        area = { x: area.x, y: area.y + thickness, width: area.width, height: area.height - thickness };
      }
    }
    return result;
  }

  update(ctx: StandaloneRenderContext): void {
    this.lastCtx = ctx;
    this.hits = [];
    this.nodes = [];
    if (!this.visible) return;
    const roots = this.parse(ctx.data);
    const group = new Group();
    const headerHeight = this.options.groupHeaderHeight ?? 18;
    const tileGap = this.options.itemPadding ?? 2;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;

    const renderLevel = (items: TreeNode[], rect: RectArea) => {
      for (const { node, rect: tile } of this.squarify(items, rect)) {
        const nodeIndex = this.nodes.length;
        this.nodes.push(node);
        const inner: RectArea = {
          x: tile.x + tileGap / 2,
          y: tile.y + tileGap / 2,
          width: Math.max(0, tile.width - tileGap),
          height: Math.max(0, tile.height - tileGap),
        };
        if (node.children.length > 0) {
          const header = new Rect();
          header.x = inner.x;
          header.y = inner.y;
          header.width = inner.width;
          header.height = Math.min(headerHeight, inner.height);
          header.fill = this.colorFor(node.branchIndex);
          group.append(header);
          const title = new Text();
          title.text = node.label;
          title.x = inner.x + 5;
          title.y = inner.y + header.height / 2;
          title.textBaseline = 'middle';
          title.fontSize = 11;
          title.fontWeight = 'bold';
          title.fontFamily = this.env.theme.fontFamily;
          title.fill = this.env.theme.backgroundColor;
          group.append(title);
          this.registerHit(nodeIndex, inner.x, inner.y, inner.width, header.height);
          renderLevel(node.children, {
            x: inner.x,
            y: inner.y + header.height,
            width: inner.width,
            height: inner.height - header.height,
          });
        } else {
          const tileNode = new Rect();
          tileNode.x = inner.x;
          tileNode.y = inner.y;
          tileNode.width = inner.width;
          tileNode.height = inner.height;
          tileNode.fill = this.colorFor(node.branchIndex);
          tileNode.opacity = 0.55 + 0.35 * Math.min(1, node.depth / 2);
          tileNode.cornerRadius = 2;
          if (nodeIndex === highlighted) {
            tileNode.opacity = 1;
          }
          group.append(tileNode);
          this.registerHit(nodeIndex, inner.x, inner.y, inner.width, inner.height);
          if (this.options.label?.enabled !== false && inner.width > 46 && inner.height > 22) {
            const labelOptions = this.options.label;
            const label = new Text();
            label.text = labelOptions?.formatter
              ? labelOptions.formatter({ datum: node.meta, label: node.label, value: node.value })
              : node.label;
            const placement = labelOptions?.placement ?? 'center';
            const inset = 7;
            const horizontal = placement.includes('left') ? 'left' : placement.includes('right') ? 'right' : 'center';
            const vertical = placement.includes('top') ? 'top' : placement.includes('bottom') ? 'bottom' : 'middle';
            label.x =
              horizontal === 'left' ? inner.x + inset : horizontal === 'right' ? inner.x + inner.width - inset : inner.x + inner.width / 2;
            label.y =
              vertical === 'top' ? inner.y + inset : vertical === 'bottom' ? inner.y + inner.height - inset : inner.y + inner.height / 2;
            label.textAlign = horizontal;
            label.textBaseline = vertical;
            label.fontSize = labelOptions?.fontSize ?? 11;
            label.fontWeight = labelOptions?.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
            label.fontFamily = labelOptions?.fontFamily ?? this.env.theme.fontFamily;
            label.fill = labelOptions?.color ?? contrastTextColor(tileNode.fill ?? '#000');
            label.outline = tileNode.fill;
            group.append(label);
          }
        }
      }
    };
    renderLevel(roots, { ...ctx.plot });
    group.opacity = ctx.animationT ?? 1;
    ctx.layer.append(group);
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const node = this.nodes[datumIndex];
    if (!node) return { rows: [] };
    return {
      heading: node.label,
      rows: [{ label: this.options.sizeField ?? 'size', value: String(node.value), color: this.colorFor(node.branchIndex) }],
    };
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

export const treemapSeriesModule: SeriesModule<TreemapSeriesOptions> = {
  kind: 'series',
  type: 'treemap',
  chartKind: 'hierarchy',
  create: (options, env) => new TreemapSeries(options, env),
};
