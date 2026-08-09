import { StandaloneSeries, type StandaloneSeriesBaseOptions } from '@/entities/series/base';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { SeriesModule, SeriesPick, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type { FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Path, Sector, Text } from '@/shared/scene';

export interface ChordSeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'chord';
  fromField: string;
  toField: string;
  sizeField: string;
  /** Gap between node arcs, in px along the inner radius (12 by default). */
  nodeSpacing?: Pixels;
  /** Ribbon opacity (0.35 by default). */
  linkOpacity?: number;
  /** Node labels. */
  label?: Switchable &
    FontOptions & {
      formatter?: (params: { name: string; total: number }) => string;
    };
}

interface ChordNode {
  name: string;
  total: number;
  startAngle: number;
  endAngle: number;
  cursor: number;
}

const RING = 12;

export class ChordSeries extends StandaloneSeries<ChordSeriesOptions> {
  readonly type = 'chord';
  private nodeList: ChordNode[] = [];
  private center = { x: 0, y: 0 };
  private outerRadius = 0;

  private pointAt(angle: number, radius: number): { x: number; y: number } {
    return { x: this.center.x + Math.sin(angle) * radius, y: this.center.y - Math.cos(angle) * radius };
  }

  update(ctx: StandaloneRenderContext): void {
    this.lastCtx = ctx;
    this.nodeList = [];
    if (!this.visible) return;
    const { data, plot } = ctx;
    const { fromField, toField, sizeField } = this.options;

    const totals = new Map<string, number>();
    for (const datum of data) {
      const value = Number(datum[sizeField]) || 0;
      for (const key of [fromField, toField]) {
        const name = String(datum[key]);
        totals.set(name, (totals.get(name) ?? 0) + value);
      }
    }
    const names = [...totals.keys()];
    const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);
    if (grandTotal <= 0 || names.length === 0) return;

    this.center = { x: plot.x + plot.width / 2, y: plot.y + plot.height / 2 };
    this.outerRadius = Math.min(plot.width, plot.height) / 2 - 24;
    const innerRadius = this.outerRadius - RING;
    const t = ctx.animationT ?? 1;
    const gap = (this.options.nodeSpacing ?? 12) / innerRadius;
    const sweepTotal = Math.PI * 2 - gap * names.length;

    let cursor = 0;
    const nodeMap = new Map<string, ChordNode>();
    for (const name of names) {
      const sweep = ((totals.get(name) ?? 0) / grandTotal) * sweepTotal * t;
      const node: ChordNode = { name, total: totals.get(name) ?? 0, startAngle: cursor, endAngle: cursor + sweep, cursor };
      nodeMap.set(name, node);
      this.nodeList.push(node);
      cursor += sweep + gap;
    }

    const group = new Group();

    // flow ribbons
    for (const datum of data) {
      const from = nodeMap.get(String(datum[fromField]));
      const to = nodeMap.get(String(datum[toField]));
      const value = Number(datum[sizeField]) || 0;
      if (!from || !to || value <= 0) continue;
      const fromSweep = (value / from.total) * (from.endAngle - from.startAngle) || 0;
      const toSweep = (value / to.total) * (to.endAngle - to.startAngle) || 0;
      const a0 = from.cursor;
      const a1 = from.cursor + fromSweep;
      const b0 = to.cursor;
      const b1 = to.cursor + toSweep;
      from.cursor = a1;
      to.cursor = b1;

      const ribbon = new Path();
      const p0 = this.pointAt(a0, innerRadius);
      ribbon.moveTo(p0.x, p0.y);
      this.arcSegment(ribbon, a0, a1, innerRadius);
      const q0 = this.pointAt(b0, innerRadius);
      ribbon.curveTo(this.center.x, this.center.y, this.center.x, this.center.y, q0.x, q0.y);
      this.arcSegment(ribbon, b0, b1, innerRadius);
      const back = this.pointAt(a0, innerRadius);
      ribbon.curveTo(this.center.x, this.center.y, this.center.x, this.center.y, back.x, back.y);
      ribbon.closePath();
      const fromIndex = this.nodeList.indexOf(from);
      ribbon.fill = this.colorFor(fromIndex);
      ribbon.opacity = this.options.linkOpacity ?? this.env.theme.fillOpacity ?? 0.35;
      group.append(ribbon);
    }

    // node arcs and labels
    this.nodeList.forEach((node, index) => {
      const arc = new Sector();
      arc.centerX = this.center.x;
      arc.centerY = this.center.y;
      arc.innerRadius = innerRadius;
      arc.outerRadius = this.outerRadius;
      arc.startAngle = node.startAngle;
      arc.endAngle = node.endAngle;
      arc.fill = this.colorFor(index);
      group.append(arc);

      const mid = (node.startAngle + node.endAngle) / 2;
      const at = this.pointAt(mid, this.outerRadius + 8);
      if (this.options.label?.enabled === false) return;
      const labelOptions = this.options.label;
      const label = new Text();
      label.text = labelOptions?.formatter ? labelOptions.formatter({ name: node.name, total: node.total }) : node.name;
      label.x = at.x;
      label.y = at.y;
      const sin = Math.sin(mid);
      label.textAlign = Math.abs(sin) < 0.25 ? 'center' : sin > 0 ? 'left' : 'right';
      label.textBaseline = Math.cos(mid) > 0.6 ? 'bottom' : Math.cos(mid) < -0.6 ? 'top' : 'middle';
      label.fontSize = labelOptions?.fontSize ?? themeFont(this.env.theme, FONT_STEP.label);
      label.fontWeight = labelOptions?.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
      label.fontFamily = labelOptions?.fontFamily ?? this.env.theme.fontFamily;
      label.fill = labelOptions?.color ?? this.env.theme.foregroundColor;
      group.append(label);
    });
    ctx.layer.append(group);
  }

  /** Circular arc as line segments (Path has no arc command). */
  private arcSegment(path: Path, from: number, to: number, radius: number): void {
    const steps = Math.max(2, Math.ceil(((to - from) / Math.PI) * 18));
    for (let i = 1; i <= steps; i++) {
      const angle = from + ((to - from) * i) / steps;
      const point = this.pointAt(angle, radius);
      path.lineTo(point.x, point.y);
    }
  }

  override pick(x: number, y: number): SeriesPick | undefined {
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const radius = Math.hypot(dx, dy);
    if (radius < this.outerRadius - RING - 4 || radius > this.outerRadius + 4) return undefined;
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    for (let i = 0; i < this.nodeList.length; i++) {
      const node = this.nodeList[i];
      if (!node) continue;
      if (angle >= node.startAngle && angle <= node.endAngle) {
        const mid = (node.startAngle + node.endAngle) / 2;
        const at = this.pointAt(mid, this.outerRadius);
        return { seriesId: this.id, datumIndex: i, distance: 0, x: at.x, y: at.y };
      }
    }
    return undefined;
  }

  override nodeAt(datumIndex: number): SeriesPick | undefined {
    const node = this.nodeList[datumIndex];
    if (!node) return undefined;
    const at = this.pointAt((node.startAngle + node.endAngle) / 2, this.outerRadius);
    return { seriesId: this.id, datumIndex, distance: 0, x: at.x, y: at.y };
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const node = this.nodeList[datumIndex];
    if (!node) return { rows: [] };
    return {
      heading: node.name,
      rows: [{ label: this.options.sizeField, value: String(node.total), color: this.colorFor(datumIndex) }],
    };
  }
}

export const chordSeriesModule: SeriesModule<ChordSeriesOptions> = {
  kind: 'series',
  type: 'chord',
  requiredOptions: ['fromField', 'toField', 'sizeField'],
  chartKind: 'flow',
  create: (options, env) => new ChordSeries(options, env),
};
