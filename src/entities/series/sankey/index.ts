import { columnHeight, fitNodeSpacing, fitValueScale, MIN_NODE_HEIGHT } from './layout';
import { FlowSeries, type FlowSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type { Pixels } from '@/shared/options';
import { Group, Path, Rect } from '@/shared/scene';

export interface SankeySeriesOptions extends FlowSeriesBaseOptions {
  type: 'sankey';
  fromField: string;
  toField: string;
  sizeField: string;
  node?: { width?: Pixels; spacing?: Pixels };
  /** Opacity of the flow ribbons (0.35 by default). */
  linkOpacity?: number;
}

interface SankeyNode {
  name: string;
  depth: number;
  total: number;
  /** What the whole column carries — the whole this node is a share of. */
  columnTotal: number;
  x: number;
  y: number;
  height: number;
  colorIndex: number;
  outOffset: number;
  inOffset: number;
}

const DEFAULT_NODE_WIDTH = 14;
const DEFAULT_NODE_SPACING = 14;
/** Clearance between a node and the label beside it. */
const LABEL_GAP = 6;

export class SankeySeries extends FlowSeries<SankeySeriesOptions> {
  readonly type = 'sankey';
  private nodes = new Map<string, SankeyNode>();
  private nodeList: SankeyNode[] = [];

  override valueFields(): string[] {
    return [this.options.sizeField];
  }

  update(ctx: StandaloneRenderContext): void {
    this.lastCtx = ctx;
    this.hits = [];
    this.nodes = new Map();
    this.nodeList = [];
    if (!this.visible) return;
    const { data, plot } = ctx;
    const { fromField, toField, sizeField } = this.options;

    // node depth: iteratively from sources
    const names: string[] = [];
    const seen = new Set<string>();
    for (const datum of data) {
      for (const key of [fromField, toField]) {
        const name = String(datum[key]);
        if (!seen.has(name)) {
          seen.add(name);
          names.push(name);
        }
      }
    }
    const depth = new Map<string, number>(names.map((name) => [name, 0]));
    for (let pass = 0; pass < names.length; pass++) {
      let changed = false;
      for (const datum of data) {
        const from = String(datum[fromField]);
        const to = String(datum[toField]);
        const next = (depth.get(from) ?? 0) + 1;
        if (next > (depth.get(to) ?? 0) && next < names.length) {
          depth.set(to, next);
          changed = true;
        }
      }
      if (!changed) break;
    }

    // total flow of a node
    const totals = new Map<string, number>();
    for (const datum of data) {
      const value = Number(datum[sizeField]) || 0;
      const from = String(datum[fromField]);
      totals.set(from, (totals.get(from) ?? 0) + value);
    }
    const incoming = new Map<string, number>();
    for (const datum of data) {
      const value = Number(datum[sizeField]) || 0;
      const to = String(datum[toField]);
      incoming.set(to, (incoming.get(to) ?? 0) + value);
    }
    for (const name of names) {
      totals.set(name, Math.max(totals.get(name) ?? 0, incoming.get(name) ?? 0));
    }

    const maxDepth = Math.max(...names.map((name) => depth.get(name) ?? 0));
    const nodeWidth = this.options.node?.width ?? DEFAULT_NODE_WIDTH;
    const columns = new Map<number, string[]>();
    for (const name of names) {
      const d = depth.get(name) ?? 0;
      const column = columns.get(d) ?? [];
      column.push(name);
      columns.set(d, column);
    }
    const columnTotals = [...columns.values()].map((column) => column.map((name) => totals.get(name) ?? 0));
    if (columnTotals.every((column) => column.reduce((sum, total) => sum + total, 0) <= 0)) return;

    const nodeSpacing = fitNodeSpacing(columnTotals, plot.height, this.options.node?.spacing ?? DEFAULT_NODE_SPACING);
    const t = ctx.animationT ?? 1;
    const valueScale = fitValueScale(columnTotals, plot.height, nodeSpacing) * t;

    // node layout by columns, each centred on what it takes up
    for (const [d, column] of columns) {
      const span = columnHeight(
        column.map((name) => totals.get(name) ?? 0),
        valueScale,
        nodeSpacing,
      );
      let y = plot.y + (plot.height - span) / 2;
      const x = plot.x + (maxDepth === 0 ? 0 : (d / maxDepth) * (plot.width - nodeWidth));
      const columnTotal = column.reduce((sum, name) => sum + (totals.get(name) ?? 0), 0);
      for (const name of column) {
        const height = Math.max(MIN_NODE_HEIGHT, (totals.get(name) ?? 0) * valueScale);
        const node: SankeyNode = {
          name,
          depth: d,
          total: totals.get(name) ?? 0,
          columnTotal,
          x,
          y,
          height,
          colorIndex: this.nodeList.length,
          outOffset: 0,
          inOffset: 0,
        };
        this.nodes.set(name, node);
        this.nodeList.push(node);
        y += height + nodeSpacing;
      }
    }

    const group = new Group();
    // links below the nodes
    for (const datum of data) {
      const from = this.nodes.get(String(datum[fromField]));
      const to = this.nodes.get(String(datum[toField]));
      const value = (Number(datum[sizeField]) || 0) * valueScale;
      if (!from || !to || value <= 0) continue;
      const y0 = from.y + from.outOffset;
      const y1 = to.y + to.inOffset;
      from.outOffset += value;
      to.inOffset += value;
      const x0 = from.x + nodeWidth;
      const x1 = to.x;
      const cx = (x0 + x1) / 2;

      const link = new Path();
      link.moveTo(x0, y0);
      link.curveTo(cx, y0, cx, y1, x1, y1);
      link.lineTo(x1, y1 + value);
      link.curveTo(cx, y1 + value, cx, y0 + value, x0, y0 + value);
      link.closePath();
      link.fill = this.colorFor(from.colorIndex);
      link.opacity = this.options.linkOpacity ?? this.env.theme.fillOpacity ?? 0.35;
      group.append(link);
    }

    this.nodeList.forEach((node, index) => {
      const rect = new Rect();
      rect.x = node.x;
      rect.y = node.y;
      rect.width = nodeWidth;
      rect.height = node.height;
      rect.fill = this.colorFor(node.colorIndex);
      rect.cornerRadius = 2;
      group.append(rect);
      this.registerHit(index, node.x - 2, node.y - 2, nodeWidth + 4, node.height + 4);

      // the label stands beside its node, on the side that has the room: the
      // last column reads inwards, every other one outwards
      if (!this.labelsShown || !this.worthLabelling(node.total, node.columnTotal)) return;
      const parts = this.labelPartsFor({
        name: node.name,
        total: node.total,
        share: node.columnTotal > 0 ? node.total / node.columnTotal : 0,
      });
      const rightSide = node.x > plot.x + plot.width / 2;
      this.drawNodeLabel(
        group,
        parts,
        rightSide ? node.x - LABEL_GAP : node.x + nodeWidth + LABEL_GAP,
        node.y + node.height / 2,
        rightSide ? 'right' : 'left',
        ctx.measureText,
        ctx.labelGuard,
      );
    });
    ctx.layer.append(group);
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const node = this.nodeList[datumIndex];
    if (!node) return { rows: [] };
    return this.nodeTooltip({
      label: node.name,
      value: node.total,
      valueField: this.options.sizeField,
      color: this.colorFor(node.colorIndex),
    });
  }
}

export const sankeySeriesModule: SeriesModule<SankeySeriesOptions> = {
  kind: 'series',
  type: 'sankey',
  requiredOptions: ['fromField', 'toField', 'sizeField'],
  chartKind: 'flow',
  create: (options, env) => new SankeySeries(options, env),
};
