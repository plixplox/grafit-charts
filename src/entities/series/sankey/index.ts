import { StandaloneSeries, type StandaloneSeriesBaseOptions } from '@/entities/series/base';
import type { SeriesModule, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type { FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Path, Rect, Text } from '@/shared/scene';

export interface SankeySeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'sankey';
  fromField: string;
  toField: string;
  sizeField: string;
  node?: { width?: Pixels; spacing?: Pixels };
  /** Opacity of the flow ribbons (0.35 by default). */
  linkOpacity?: number;
  /** Node labels. */
  label?: Switchable &
    FontOptions & {
      formatter?: (params: { name: string; total: number }) => string;
    };
}

interface SankeyNode {
  name: string;
  depth: number;
  total: number;
  x: number;
  y: number;
  height: number;
  colorIndex: number;
  outOffset: number;
  inOffset: number;
}

export class SankeySeries extends StandaloneSeries<SankeySeriesOptions> {
  readonly type = 'sankey';
  private nodes = new Map<string, SankeyNode>();
  private nodeList: SankeyNode[] = [];

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
    const nodeWidth = this.options.node?.width ?? 14;
    const nodeSpacing = this.options.node?.spacing ?? 14;
    const columns = new Map<number, string[]>();
    for (const name of names) {
      const d = depth.get(name) ?? 0;
      const column = columns.get(d) ?? [];
      column.push(name);
      columns.set(d, column);
    }
    let maxColumnTotal = 0;
    for (const column of columns.values()) {
      maxColumnTotal = Math.max(
        maxColumnTotal,
        column.reduce((sum, name) => sum + (totals.get(name) ?? 0), 0),
      );
    }
    if (maxColumnTotal <= 0) return;
    const t = ctx.animationT ?? 1;
    const valueScale = ((plot.height - nodeSpacing * 4) / maxColumnTotal) * t;

    // node layout by columns
    for (const [d, column] of columns) {
      const columnHeight = column.reduce((sum, name) => sum + (totals.get(name) ?? 0) * valueScale, 0) + nodeSpacing * (column.length - 1);
      let y = plot.y + (plot.height - columnHeight) / 2;
      const x = plot.x + (maxDepth === 0 ? 0 : (d / maxDepth) * (plot.width - nodeWidth));
      for (const name of column) {
        const height = Math.max(2, (totals.get(name) ?? 0) * valueScale);
        const node: SankeyNode = {
          name,
          depth: d,
          total: totals.get(name) ?? 0,
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
      link.opacity = this.options.linkOpacity ?? 0.35;
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

      if (this.options.label?.enabled === false) return;
      const labelOptions = this.options.label;
      const label = new Text();
      label.text = labelOptions?.formatter ? labelOptions.formatter({ name: node.name, total: node.total }) : node.name;
      const rightSide = node.x > plot.x + plot.width / 2;
      label.x = rightSide ? node.x - 6 : node.x + nodeWidth + 6;
      label.y = node.y + node.height / 2;
      label.textAlign = rightSide ? 'right' : 'left';
      label.textBaseline = 'middle';
      label.fontSize = labelOptions?.fontSize ?? 11;
      label.fontWeight = labelOptions?.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
      label.fontFamily = labelOptions?.fontFamily ?? this.env.theme.fontFamily;
      label.fill = labelOptions?.color ?? this.env.theme.foregroundColor;
      group.append(label);
    });
    ctx.layer.append(group);
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const node = this.nodeList[datumIndex];
    if (!node) return { rows: [] };
    return {
      heading: node.name,
      rows: [{ label: this.options.sizeField, value: String(node.total), color: this.colorFor(node.colorIndex) }],
    };
  }
}

export const sankeySeriesModule: SeriesModule<SankeySeriesOptions> = {
  kind: 'series',
  type: 'sankey',
  requiredOptions: ['fromField', 'toField', 'sizeField'],
  chartKind: 'flow',
  create: (options, env) => new SankeySeries(options, env),
};
