import { StandaloneSeries, type StandaloneSeriesBaseOptions } from '@/entities/series/base';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { LegendItemDescriptor, MeasureText, SeriesModule, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type {
  ColorValue,
  Datum,
  FontOptions,
  Formattable,
  PartLabelBlockOptions,
  PartLabelLayout,
  PartNameParams,
  PartValueLabelOptions,
  Pixels,
  Switchable,
} from '@/shared/options';
import { Group, Rect } from '@/shared/scene';
import {
  contrastTextColor,
  drawLabelBlock,
  formatValue,
  formattedText,
  labelBlockSize,
  labelParts,
  mixColors,
  partText,
  worthLabelling,
  type LabelPart,
  type LabelPartDefaults,
} from '@/shared/util';

export interface TreemapSeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'treemap';
  labelField?: string;
  sizeField?: string;
  childrenField?: string;
  /**
   * How the value of `labelField` becomes text — for the legend, the tooltip
   * heading, the group header and the name half of a tile label alike. A name
   * is a field value, and the format of that field belongs to the series rather
   * than to each place the name is printed in. `label.category` overrides it
   * where a tile wants something shorter than the legend.
   */
  labelName?: Formattable<PartNameParams>;
  /**
   * The strip a group is named in: how tall it is, what it is filled with and
   * the font of its text. Transparent by default, so a header reads as a
   * heading over the group rather than as a tile of its own.
   */
  groupHeader?: TreemapGroupHeaderOptions;
  /** @deprecated use `groupHeader.height`. */
  groupHeaderHeight?: number;
  /**
   * Gap between neighbouring tiles (2 by default). Only between them: a tile on
   * the edge of its group — or of the chart — keeps that edge, so the padding of
   * the plot stays the padding of the plot.
   */
  itemGap?: Pixels;
  /** The same, between neighbouring groups; falls back to `itemGap`. */
  groupGap?: Pixels;
  /**
   * Tile labels: the name of a node and its value, drawn as one block so the
   * two always read together — each half with its own font, `layout` putting
   * the value on a line of its own (default) or in the same row. Enabled by
   * default, name only; the color is auto-contrast against the tile.
   * A label that does not fit its tile is not drawn.
   */
  label?: TreemapLabelOptions;
}

/**
 * The header strip of a group. The font falls back to `label`'s, so a chart that
 * sets one font for its tiles gets the same one in its headings — bold, and in
 * the color of the group unless the strip is filled.
 */
export interface TreemapGroupHeaderOptions extends FontOptions {
  /** Height of the strip (18 by default). */
  height?: Pixels;
  /** Fill behind the text — none by default. */
  background?: ColorValue;
}

/** Where the label block sits within its tile. */
export type TreemapLabelPlacement =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface TreemapLabelOptions extends Switchable, FontOptions, PartLabelBlockOptions<TreemapLabelFormatterParams> {
  /** Placement within the tile (center by default). */
  placement?: TreemapLabelPlacement;
  /** The whole label at once; it wins over `category`/`value`. */
  formatter?: (params: TreemapLabelFormatterParams) => string;
}

/** Tile value — the value itself by default; `type: 'percent'` reads it as a share. Off until asked for. */
export type TreemapValueLabelOptions = PartValueLabelOptions<TreemapLabelFormatterParams>;

export interface TreemapLabelFormatterParams {
  datum: Datum;
  /** Node name (labelField). */
  label: string;
  /** Size of the node: its own for a tile, the sum of its children for a group. */
  value: number;
  /** Share of the chart total, 0..1. */
  share: number;
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

/** How far a hovered tile moves towards its contrast color. */
const HIGHLIGHT_LIFT = 0.18;
/** Room a label keeps between itself and the edge of its tile. */
const LABEL_INSET = 7;
/** The same, inside the header strip of a group. */
const HEADER_INSET = 5;
/** How close to the edge of its area a tile has to be to count as sitting on it. */
const EDGE_EPSILON = 0.5;

export class TreemapSeries extends StandaloneSeries<TreemapSeriesOptions> {
  readonly type = 'treemap';
  private nodes: TreeNode[] = [];
  /** Sum of the roots — what a share of the whole is measured against. */
  private total = 0;

  private get labelField(): string {
    return this.options.labelField ?? 'label';
  }

  private get sizeField(): string {
    return this.options.sizeField ?? 'size';
  }

  /** 'stacked' by default: the value sits on its own line under the name. */
  private get labelLayout(): PartLabelLayout {
    return this.options.label?.layout ?? 'stacked';
  }

  /** Whether the name of a node is part of its label. */
  private get categoryShown(): boolean {
    return this.options.label?.category?.enabled !== false;
  }

  /** A tile is named, not measured, until the value half is asked for. */
  private get valueShown(): boolean {
    return this.options.label?.value?.enabled === true;
  }

  private shareOf(value: number): number {
    return this.total > 0 ? value / this.total : 0;
  }

  private formatterParams(node: TreeNode): TreemapLabelFormatterParams {
    return { datum: node.meta, label: node.label, value: node.value, share: this.shareOf(node.value) };
  }

  /**
   * Text of the name half. The field a node is named by carries a format of its
   * own — a date, a code — so the name is formatted like the value beside it
   * rather than printed raw.
   */
  private categoryText(node: TreeNode): string {
    // a tile may want something shorter than the legend, so its own format wins
    return formattedText(node.meta[this.labelField], this.options.label?.category, this.formatterParams(node)) ?? node.label;
  }

  /** Text of the value half: the summed size unless a share was asked for. */
  private valueText(node: TreeNode): string {
    const options = this.options.label?.value;
    if (options?.formatter) return options.formatter(this.formatterParams(node));
    if (options?.type === 'percent') {
      const share = this.shareOf(node.value);
      return options.format ? formatValue(options.format, share) : `${Math.round(share * 100)}%`;
    }
    return options?.format ? formatValue(options.format, node.value) : String(node.value);
  }

  /** Font a tile label starts from: the label options over the theme, ink chosen against the tile. */
  private tileDefaults(fill: string): LabelPartDefaults {
    const options = this.options.label;
    return {
      fontSize: options?.fontSize ?? themeFont(this.env.theme, FONT_STEP.label),
      fontFamily: options?.fontFamily ?? this.env.theme.fontFamily,
      fontWeight: options?.fontWeight !== undefined ? String(options.fontWeight) : 'normal',
      color: options?.color ?? contrastTextColor(fill),
    };
  }

  /**
   * The same for a header: `groupHeader` over `label` over the theme, bold. An
   * unfilled strip has no color to contrast against, so the heading is written
   * in the color of the group it names.
   */
  private headerDefaults(node: TreeNode, background: ColorValue | undefined): LabelPartDefaults {
    const label = this.options.label;
    const header = this.options.groupHeader;
    const weight = header?.fontWeight ?? label?.fontWeight;
    return {
      fontSize: header?.fontSize ?? label?.fontSize ?? themeFont(this.env.theme, FONT_STEP.label),
      fontFamily: header?.fontFamily ?? label?.fontFamily ?? this.env.theme.fontFamily,
      fontWeight: weight !== undefined ? String(weight) : 'bold',
      color: header?.color ?? label?.color ?? (background ? contrastTextColor(background) : this.colorFor(node.branchIndex)),
    };
  }

  /**
   * The label of one node, run by run. `label.formatter` speaks for the whole
   * label when it is given; otherwise the name and the value are two runs, each
   * with its own font over the label's.
   */
  private labelPartsFor(node: TreeNode, defaults: LabelPartDefaults, layout: PartLabelLayout): LabelPart[] {
    const options = this.options.label;
    if (options?.formatter) {
      return labelParts([{ text: options.formatter(this.formatterParams(node)) }], defaults, options);
    }
    const entries: Array<{ text: string; font?: Switchable & FontOptions }> = [];
    if (this.categoryShown) entries.push({ text: this.categoryText(node), font: options?.category });
    if (this.valueShown) entries.push({ text: this.valueText(node), font: options?.value });
    return labelParts(entries, defaults, { layout, separator: options?.separator });
  }

  /** Whether a node is labelled at all: the option, and its share of the whole (label.minShare). */
  private worthLabelling(node: TreeNode): boolean {
    if (this.options.label?.enabled === false) return false;
    if (!this.categoryShown && !this.valueShown && !this.options.label?.formatter) return false;
    return worthLabelling(node.value, this.total, this.options.label?.minShare);
  }

  /**
   * Draws the label of a tile where `placement` asks for it — but only when the
   * whole block fits inside, insets and all. A tile is the room the label has;
   * one that spills out of it says less than no label at all.
   */
  private drawTileLabel(group: Group, node: TreeNode, area: RectArea, fill: string, measureText: MeasureText): void {
    if (!this.worthLabelling(node)) return;
    const parts = this.labelPartsFor(node, this.tileDefaults(fill), this.labelLayout);
    if (parts.length === 0) return;
    const block = labelBlockSize(parts, measureText, this.labelLayout);
    if (block.width + LABEL_INSET * 2 > area.width || block.height + LABEL_INSET * 2 > area.height) return;
    const placement = this.options.label?.placement ?? 'center';
    const align = placement.includes('left') ? 'left' : placement.includes('right') ? 'right' : 'center';
    const x = align === 'left' ? area.x + LABEL_INSET : align === 'right' ? area.x + area.width - LABEL_INSET : area.x + area.width / 2;
    const y = placement.includes('top')
      ? area.y + LABEL_INSET + block.height / 2
      : placement.includes('bottom')
        ? area.y + area.height - LABEL_INSET - block.height / 2
        : area.y + area.height / 2;
    drawLabelBlock(group, parts, x, y, align, measureText, this.labelLayout, fill);
  }

  /**
   * The label of a group: the same halves a tile reads, in the header strip.
   * A header is one line high whatever `layout` says, and the name leads from
   * the left edge — a group is a heading, not a tile. The halo is whatever the
   * text is written over: the strip when it is filled, the chart when it is not.
   */
  private drawHeaderLabel(
    group: Group,
    node: TreeNode,
    area: RectArea,
    background: ColorValue | undefined,
    measureText: MeasureText,
  ): void {
    if (!this.worthLabelling(node)) return;
    const parts = this.labelPartsFor(node, this.headerDefaults(node, background), 'inline');
    if (parts.length === 0) return;
    const block = labelBlockSize(parts, measureText, 'inline');
    if (block.width + HEADER_INSET * 2 > area.width || block.height > area.height) return;
    const halo = background ?? this.env.theme.backgroundColor;
    drawLabelBlock(group, parts, area.x + HEADER_INSET, area.y + area.height / 2, 'left', measureText, 'inline', halo);
  }

  private parse(data: Datum[]): TreeNode[] {
    const sizeField = this.sizeField;
    const childrenField = this.options.childrenField ?? 'children';
    const walk = (items: Datum[], depth: number, branchIndex: number): TreeNode[] =>
      items.map((item, index) => {
        const childItems = item[childrenField];
        const children = Array.isArray(childItems) ? walk(childItems as Datum[], depth + 1, depth === 0 ? index : branchIndex) : [];
        const own = Number(item[sizeField]);
        const value = children.length > 0 ? children.reduce((sum, child) => sum + child.value, 0) : Number.isNaN(own) ? 0 : own;
        const rawName = item[this.labelField] ?? index;
        return {
          label: partText(rawName, this.options.labelName, { datum: item, value: rawName }),
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

  /**
   * A tile gives up half the gap on every side it shares with a neighbour, and
   * nothing on a side that is the edge of the area it was laid out in: the gap
   * belongs between the tiles, not around the whole treemap.
   */
  private insetTile(tile: RectArea, area: RectArea, gap: number): RectArea {
    const half = gap / 2;
    const left = tile.x - area.x > EDGE_EPSILON ? half : 0;
    const top = tile.y - area.y > EDGE_EPSILON ? half : 0;
    const right = area.x + area.width - (tile.x + tile.width) > EDGE_EPSILON ? half : 0;
    const bottom = area.y + area.height - (tile.y + tile.height) > EDGE_EPSILON ? half : 0;
    return {
      x: tile.x + left,
      y: tile.y + top,
      width: Math.max(0, tile.width - left - right),
      height: Math.max(0, tile.height - top - bottom),
    };
  }

  update(ctx: StandaloneRenderContext): void {
    this.lastCtx = ctx;
    this.hits = [];
    this.nodes = [];
    if (!this.visible) return;
    const roots = this.parse(ctx.data);
    this.total = roots.reduce((sum, node) => sum + node.value, 0);
    const group = new Group();
    const headerHeight = this.options.groupHeader?.height ?? this.options.groupHeaderHeight ?? 18;
    const headerBackground = this.options.groupHeader?.background;
    const itemGap = this.options.itemGap ?? 2;
    const groupGap = this.options.groupGap ?? itemGap;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;

    const renderLevel = (items: TreeNode[], area: RectArea) => {
      for (const { node, rect: tile } of this.squarify(items, area)) {
        const nodeIndex = this.nodes.length;
        this.nodes.push(node);
        const isGroup = node.children.length > 0;
        const inner = this.insetTile(tile, area, isGroup ? groupGap : itemGap);
        if (isGroup) {
          const strip = Math.min(headerHeight, inner.height);
          if (headerBackground) {
            const header = new Rect();
            header.x = inner.x;
            header.y = inner.y;
            header.width = inner.width;
            header.height = strip;
            header.fill = headerBackground;
            group.append(header);
          }
          this.drawHeaderLabel(group, node, { ...inner, height: strip }, headerBackground, ctx.measureText);
          this.registerHit(nodeIndex, inner.x, inner.y, inner.width, strip);
          renderLevel(node.children, {
            x: inner.x,
            y: inner.y + strip,
            width: inner.width,
            height: inner.height - strip,
          });
        } else {
          const tileNode = new Rect();
          tileNode.x = inner.x;
          tileNode.y = inner.y;
          tileNode.width = inner.width;
          tileNode.height = inner.height;
          const branchColor = this.colorFor(node.branchIndex);
          // Tiles carry their branch color at full strength; hovering lifts the tile
          // towards its own contrast color instead of dropping the others' alpha.
          tileNode.fill = nodeIndex === highlighted ? mixColors(branchColor, contrastTextColor(branchColor), HIGHLIGHT_LIFT) : branchColor;
          tileNode.cornerRadius = 2;
          group.append(tileNode);
          this.registerHit(nodeIndex, inner.x, inner.y, inner.width, inner.height);
          this.drawTileLabel(group, node, inner, tileNode.fill, ctx.measureText);
        }
      }
    };
    renderLevel(roots, { ...ctx.plot });
    group.opacity = ctx.animationT ?? 1;
    ctx.layer.append(group);
  }

  /** The row a tile came from: nested nodes are numbered too, so an index is not a row. */
  override datumAt(datumIndex: number): Datum | undefined {
    return this.nodes[datumIndex]?.meta;
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const node = this.nodes[datumIndex];
    if (!node) return { rows: [] };
    return this.nodeTooltip({
      datum: node.meta,
      label: node.label,
      value: node.value,
      share: this.total > 0 ? this.shareOf(node.value) : undefined,
      valueField: this.sizeField,
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

export const treemapSeriesModule: SeriesModule<TreemapSeriesOptions> = {
  kind: 'series',
  type: 'treemap',
  chartKind: 'hierarchy',
  create: (options, env) => new TreemapSeries(options, env),
};
