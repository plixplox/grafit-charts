import { type BinEdge, type BinningOptions } from './bins';
import { buildModel, type BinSlice, type HistogramGroupMode, type HistogramModel, type HistogramNormalizeWithin } from './model';
import { type HistogramNormalize } from './normalize';
import {
  CartesianSeries,
  labelFont,
  placeRectLabel,
  rectLabelOverflow,
  type RectLabelPlacement,
  type SeriesBaseOptions,
} from '@/entities/series/base';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type {
  CartesianGeometry,
  CartesianRenderContext,
  Insets,
  LabelOverflowContext,
  LegendItemDescriptor,
  SeriesModule,
  SeriesNodeInfo,
  SeriesPick,
  TooltipContentData,
} from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction, FontOptions, LabelOverlapOptions, Switchable } from '@/shared/options';
import { LinearScale } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';
import { contrastTextColor, NO_OVERFLOW } from '@/shared/util';

/**
 * What a histogram tooltip is written about: a bin, not a row. The renderer
 * gets the bin's bounds and both readings of its height — the one the bar
 * draws and the aggregate it came from.
 */
export interface HistogramTooltipRendererParams {
  /** Lower bound of the bin, inclusive by default. */
  x0: number;
  /** Upper bound of the bin. */
  x1: number;
  /** What the bar draws — the aggregate restated by `normalize`. */
  value: number;
  /** The aggregate before normalization. */
  raw: number;
  /** Rows that landed in the bin. */
  count: number;
  /** Value of `groupField` for this bar; undefined without grouping. */
  group?: unknown;
  /** The group's label, or the series name when nothing splits it. */
  seriesName: string;
  color: ColorValue;
}

export interface HistogramSeriesOptions extends Omit<SeriesBaseOptions<HistogramTooltipRendererParams>, 'yField' | 'name'>, BinningOptions {
  type: 'histogram';
  /** Numeric field used to build the bins. */
  xField: string;
  /** Aggregation field; without it the count is used. */
  yField?: string;
  name?: string;
  aggregation?: 'count' | 'sum' | 'mean';
  /** What a bar's height stands for: the value itself, a share, a density, a running total. */
  normalize?: HistogramNormalize;
  /** Whose total a share is measured against: the whole chart or each group. */
  normalizeWithin?: HistogramNormalizeWithin;
  /** Field that splits the data into distributions of its own, one colour each. */
  groupField?: string;
  /** How those distributions share a bin (default `'stacked'`). */
  groupMode?: HistogramGroupMode;
  /** Colours of the groups; without it — the theme palette. */
  fills?: ColorValue[];
  /** Gap between side-by-side bars of one bin, as a fraction of a slot (`groupMode: 'grouped'`). */
  groupGap?: Fraction;
  /** Value labels: same placements as bar (top, inner-top, center, …). */
  label?: Switchable &
    FontOptions &
    LabelOverlapOptions & {
      placement?: RectLabelPlacement;
      formatter?: (params: {
        value: number;
        x0: number;
        x1: number;
        count: number;
        raw: number;
        /** The value of `groupField` this bar belongs to; undefined without grouping. */
        group?: unknown;
      }) => string;
    };
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
}

interface BinRect {
  binIndex: number;
  groupIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Overlaid distributions are read through each other, so they start translucent. */
const OVERLAY_OPACITY = 0.55;

const EMPTY_MODEL: HistogramModel = { edges: [], groups: [], grouped: false };

export class HistogramSeries extends CartesianSeries<HistogramSeriesOptions & { yField: string }> {
  readonly type = 'histogram';
  private model: HistogramModel = EMPTY_MODEL;
  private rects: BinRect[] = [];
  private data: Datum[] = [];
  private readonly hiddenGroups = new Set<number>();
  /** Bumped on every legend toggle: the memoized model is keyed on it too. */
  private hiddenVersion = 0;
  private modelCache?: { data: Datum[]; version: number; model: HistogramModel };

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  preferredXAxisType(): 'number' {
    return 'number';
  }

  protected override get seriesName(): string {
    return this.options.name ?? (this.options.aggregation === 'mean' ? 'Mean' : (this.options.yField ?? 'Count'));
  }

  /** The legend is built before anything is drawn, so the groups are read off the data early. */
  setData(data: Datum[]): void {
    this.data = data;
  }

  private get groupMode(): HistogramGroupMode {
    return this.options.groupMode ?? 'stacked';
  }

  /** Colour of a group; without grouping the series has a single one. */
  private colorFor(groupIndex: number): ColorValue {
    if (!this.model.grouped && this.options.groupField === undefined) return this.mainColor();
    const fills = this.options.fills ?? this.env.theme.palette.fills;
    return fills[groupIndex % fills.length] ?? this.mainColor();
  }

  private buildModel(data: Datum[]): HistogramModel {
    // one render asks for the model four times (x values, y domain, labels, marks)
    if (this.modelCache?.data === data && this.modelCache.version === this.hiddenVersion) return this.modelCache.model;
    const model = buildModel(data, this.options, this.hiddenGroups);
    this.modelCache = { data, version: this.hiddenVersion, model };
    this.model = model;
    return model;
  }

  override xValues(data: Datum[]): unknown[] {
    return this.buildModel(data).edges.flatMap((edge) => [edge.x0, edge.x1]);
  }

  override yDomain(data: Datum[]): [number, number] | undefined {
    const model = this.buildModel(data);
    if (model.edges.length === 0) return undefined;
    const stacking = this.stacks();
    let min = 0;
    let max = 0;
    model.edges.forEach((_, binIndex) => {
      let positive = 0;
      let negative = 0;
      for (const group of model.groups) {
        if (group.hidden) continue;
        const { value } = group.slices[binIndex]!;
        if (value >= 0) positive += value;
        else negative += value;
        // side by side or overlaid, a bar stands on its own
        if (!stacking) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
      if (stacking) {
        min = Math.min(min, negative);
        max = Math.max(max, positive);
      }
    });
    return [min, max];
  }

  /** Whether the groups of a bin pile up rather than stand apart. */
  private stacks(): boolean {
    return this.model.grouped && (this.groupMode === 'stacked' || this.groupMode === 'normalized');
  }

  /**
   * Bar rectangles in plot coordinates; shared by rendering and label
   * measurement. Hidden groups take no space — the survivors close ranks.
   */
  private layoutRects(ctx: CartesianGeometry, model: HistogramModel): BinRect[] {
    const { xScale, yScale } = ctx;
    if (!(xScale instanceof LinearScale) || !(yScale instanceof LinearScale)) {
      throw new Error('grafit: histogram requires numeric axes');
    }
    const stacking = this.stacks();
    const sideBySide = model.grouped && this.groupMode === 'grouped';
    const shown = model.groups.filter((group) => !group.hidden).length;
    const rects: BinRect[] = [];

    model.edges.forEach((edge, binIndex) => {
      const left = Math.min(xScale.convert(edge.x0), xScale.convert(edge.x1));
      const width = Math.abs(xScale.convert(edge.x1) - xScale.convert(edge.x0));
      const slotWidth = sideBySide && shown > 0 ? width / shown : width;
      const gap = sideBySide ? (this.options.groupGap ?? 0) * slotWidth : 0;
      let positive = 0;
      let negative = 0;
      let slot = 0;

      model.groups.forEach((group, groupIndex) => {
        if (group.hidden) return;
        const { value } = group.slices[binIndex]!;
        let from = 0;
        let to = value;
        if (stacking) {
          if (value >= 0) {
            from = positive;
            to = positive += value;
          } else {
            to = negative;
            from = negative += value;
          }
        }
        const edgeA = yScale.convert(from);
        const edgeB = yScale.convert(to);
        rects.push({
          binIndex,
          groupIndex,
          x: sideBySide ? left + slot * slotWidth + gap / 2 : left,
          y: Math.min(edgeA, edgeB),
          width: Math.max(0, sideBySide ? slotWidth - gap : width),
          height: Math.abs(edgeB - edgeA),
        });
        slot += 1;
      });
    });
    return rects;
  }

  /** The index a pick, a tooltip and a selection address a bar by. */
  private nodeIndex(binIndex: number, groupIndex: number): number {
    return binIndex * Math.max(1, this.model.groups.length) + groupIndex;
  }

  private sliceAt(nodeIndex: number): { edge: BinEdge; slice: BinSlice; groupIndex: number } | undefined {
    const groups = Math.max(1, this.model.groups.length);
    const binIndex = Math.floor(nodeIndex / groups);
    const groupIndex = nodeIndex % groups;
    const edge = this.model.edges[binIndex];
    const slice = this.model.groups[groupIndex]?.slices[binIndex];
    return edge && slice ? { edge, slice, groupIndex } : undefined;
  }

  private labelTextFor(edge: BinEdge, slice: BinSlice, groupIndex: number): string {
    const formatter = this.options.label?.formatter;
    if (formatter) {
      return formatter({
        value: slice.value,
        x0: edge.x0,
        x1: edge.x1,
        count: slice.count,
        raw: slice.raw,
        group: this.model.groups[groupIndex]?.key,
      });
    }
    return this.formatValue(slice.value);
  }

  /**
   * A share printed to six decimals reads as noise, so each unit gets the
   * precision it is read at. A formatter overrides all of this.
   */
  private formatValue(value: number): string {
    if (this.groupMode === 'normalized' && this.model.grouped) return `${Number(value.toFixed(1))}%`;
    switch (this.options.normalize) {
      case 'percent':
      case 'cumulative-percent':
        return `${Number(value.toFixed(1))}%`;
      case 'frequency':
        return String(Number(value.toFixed(4)));
      case 'density':
        return String(Number(value.toPrecision(4)));
      default:
        return String(Number(value.toFixed(6)));
    }
  }

  override labelOverflow(ctx: LabelOverflowContext): Insets {
    if (!this.visible || this.options.label?.enabled !== true) return NO_OVERFLOW;
    const model = this.buildModel(ctx.data);
    const marks = this.layoutRects(ctx, model).flatMap((rect) => {
      const edge = model.edges[rect.binIndex];
      const slice = model.groups[rect.groupIndex]?.slices[rect.binIndex];
      return edge && slice ? [{ rect, text: this.labelTextFor(edge, slice, rect.groupIndex) }] : [];
    });
    return rectLabelOverflow(
      marks,
      this.options.label.placement ?? 'top',
      labelFont(this.options.label, this.env.theme),
      ctx.plot,
      ctx.measureText,
    );
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.data = ctx.data;
    this.rects = [];
    if (!this.visible) return;
    const model = this.buildModel(ctx.data);
    const group = new Group();
    const labels = new Group();

    this.rects = this.layoutRects(ctx, model);
    this.rects.forEach((rect) => {
      const edge = model.edges[rect.binIndex];
      const slice = model.groups[rect.groupIndex]?.slices[rect.binIndex];
      if (!edge || !slice) return;
      const nodeIndex = this.nodeIndex(rect.binIndex, rect.groupIndex);
      const fill = this.colorFor(rect.groupIndex);

      const node = new Rect();
      node.x = rect.x;
      node.y = rect.y;
      node.width = rect.width;
      node.height = rect.height;
      node.fill = fill;
      node.opacity = this.options.fillOpacity ?? this.defaultOpacity();
      node.stroke = this.options.stroke ?? this.env.theme.backgroundColor;
      node.strokeWidth = this.options.strokeWidth ?? this.env.theme.markStrokeWidth ?? 1;
      if (ctx.selected?.has(nodeIndex)) {
        node.stroke = ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
        node.strokeWidth = ctx.selectionStyle?.strokeWidth ?? 1.5;
      }
      if (ctx.selectionActive && !ctx.selected?.has(nodeIndex)) {
        node.opacity *= ctx.selectionStyle?.inactiveOpacity ?? 0.45;
      }
      group.append(node);

      if (this.options.label?.enabled === true) {
        const labelOptions = this.options.label;
        const placed = placeRectLabel(labelOptions.placement ?? 'top', rect);
        const font = labelFont(labelOptions, this.env.theme);
        const text = new Text();
        text.text = this.labelTextFor(edge, slice, rect.groupIndex);
        text.x = placed.x;
        text.y = placed.y;
        text.textAlign = placed.align;
        text.textBaseline = placed.baseline;
        text.fontSize = font.size;
        text.fontWeight = font.weight;
        text.fontFamily = font.family;
        const elementFill = node.fill ?? fill;
        text.fill = labelOptions.color ?? (placed.inside ? contrastTextColor(elementFill) : this.env.theme.foregroundColor);
        if (placed.inside) text.outline = elementFill;
        if (this.labelFits(ctx, text, labelOptions.avoidOverlap)) labels.append(text);
      }
    });

    if (ctx.highlight && !ctx.highlight.allSeries && ctx.highlight.seriesId !== this.id) {
      group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    }
    group.opacity *= ctx.animationT ?? 1;
    this.appendGroups(ctx, group, labels);
  }

  private defaultOpacity(): number {
    if (this.model.grouped && this.groupMode === 'overlay') return OVERLAY_OPACITY;
    return this.env.theme.fillOpacity ?? 0.85;
  }

  pick(x: number, y: number): SeriesPick | undefined {
    // the last group drawn is the one on top: hit-test the pile from above
    for (let index = this.rects.length - 1; index >= 0; index--) {
      const rect = this.rects[index]!;
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        return {
          seriesId: this.id,
          datumIndex: this.nodeIndex(rect.binIndex, rect.groupIndex),
          distance: 0,
          x: rect.x + rect.width / 2,
          y: rect.y,
        };
      }
    }
    return undefined;
  }

  /**
   * The bin a bar index stands for. Without this a listener would read the
   * index as a row of the data, and a bin is not a row — the rows behind it
   * are however many landed in it.
   */
  nodeInfo(nodeIndex: number): SeriesNodeInfo | undefined {
    const found = this.sliceAt(nodeIndex);
    if (!found) return undefined;
    const { edge, slice, groupIndex } = found;
    return {
      kind: 'bin',
      x0: edge.x0,
      x1: edge.x1,
      value: slice.value,
      raw: slice.raw,
      count: slice.count,
      group: this.model.groups[groupIndex]?.key,
    };
  }

  /** Bins, not datums: the index counts bars — bin by bin, group within bin. */
  nodeAt(nodeIndex: number): SeriesPick | undefined {
    const rect = this.rects.find((candidate) => this.nodeIndex(candidate.binIndex, candidate.groupIndex) === nodeIndex);
    if (!rect) return undefined;
    return { seriesId: this.id, datumIndex: nodeIndex, distance: 0, x: rect.x + rect.width / 2, y: rect.y };
  }

  override tooltipFor(nodeIndex: number): TooltipContentData {
    const found = this.sliceAt(nodeIndex);
    if (!found) return { rows: [] };
    const { edge, slice, groupIndex } = found;
    const group = this.model.groups[groupIndex];

    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      const result = renderer({
        x0: edge.x0,
        x1: edge.x1,
        value: slice.value,
        raw: slice.raw,
        count: slice.count,
        group: group?.key,
        seriesName: this.model.grouped ? (group?.label ?? this.seriesName) : this.seriesName,
        color: this.colorFor(groupIndex),
      });
      return typeof result === 'string' ? { heading: result, rows: [] } : result;
    }

    const normalized = this.options.normalize !== undefined && this.options.normalize !== 'none';
    const percentOfBin = this.model.grouped && this.groupMode === 'normalized';
    // a share is easier to trust next to the count it came from
    const value =
      normalized || percentOfBin ? `${this.formatValue(slice.value)} (${formatEdge(slice.raw)})` : this.formatValue(slice.value);
    const label = this.model.grouped ? (this.model.groups[groupIndex]?.label ?? this.seriesName) : this.seriesName;
    return {
      heading: `${formatEdge(edge.x0)} – ${formatEdge(edge.x1)}`,
      rows: [{ label, value, color: this.colorFor(groupIndex) }],
    };
  }

  /** A legend click on a group: switched off, it draws nothing and counts towards no total. */
  toggleItem(groupIndex: number): void {
    if (this.hiddenGroups.has(groupIndex)) {
      this.hiddenGroups.delete(groupIndex);
    } else {
      this.hiddenGroups.add(groupIndex);
    }
    this.hiddenVersion += 1;
  }

  /** The chart handing back the filter it kept across an update. */
  setHiddenItems(hidden: ReadonlySet<number>): void {
    this.hiddenGroups.clear();
    for (const index of hidden) this.hiddenGroups.add(index);
    this.hiddenVersion += 1;
  }

  override legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    const model = this.buildModel(this.data);
    if (!model.grouped) return [{ seriesId: this.id, label: this.seriesName, color: this.mainColor(), visible: this.visible }];
    return model.groups.map((group, groupIndex) => ({
      seriesId: `${this.id}#${groupIndex}`,
      label: group.label,
      color: this.colorFor(groupIndex),
      visible: !group.hidden,
    }));
  }
}

function formatEdge(value: number): string {
  return String(Number(value.toFixed(6)));
}

export type { BinningOptions, BinRule, BinInclusive, BinOutliers, BinEdge } from './bins';
export { binEdges, binIndexOf, binCountFor } from './bins';
export type { HistogramNormalize } from './normalize';
export { normalizeValues } from './normalize';
export type { HistogramGroupMode, HistogramNormalizeWithin, HistogramModel, HistogramGroup, BinSlice } from './model';
export { buildModel } from './model';

export const histogramSeriesModule: SeriesModule<HistogramSeriesOptions> = {
  kind: 'series',
  type: 'histogram',
  requiredOptions: ['xField'],
  chartKind: 'cartesian',
  create: (options, env) => new HistogramSeries(options as HistogramSeriesOptions & { yField: string }, env),
};
