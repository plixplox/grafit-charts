import type {
  LegendItemDescriptor,
  SeriesEnv,
  SeriesPick,
  StandaloneRenderContext,
  StandaloneSeriesInstance,
  TooltipContentData,
} from '@/shared/kernel';
import type { ColorValue, Datum, Showable, Switchable } from '@/shared/options';
import { partTooltip, tooltipContentOf } from '@/shared/util';

/**
 * What the tooltip of a node is handed. A node of a hierarchy or a flow is not
 * a row of the data — it is a name and what it adds up to — so its renderer is
 * told that, plus the row it came from where there is one.
 */
export interface NodeTooltipRendererParams {
  /** The row the node came from; a flow node is summed from several, and has none. */
  datum?: Datum;
  /** Name of the node, as its labelField spells it out. */
  label: string;
  /** What the node adds up to: its size, or the sum of its children. */
  value: number;
  /** Share of the chart total, 0..1. */
  share: number;
  color: ColorValue;
}

/**
 * Options every axis-less series has. `TooltipParams` is what its tooltip
 * renderer is handed: a node of a hierarchy or a flow is described by its name
 * and its share by default, and a series with more to say narrows it.
 */
export interface StandaloneSeriesBaseOptions<TooltipParams = NodeTooltipRendererParams> extends Showable {
  id?: string;
  showInLegend?: boolean;
  fills?: ColorValue[];
  /**
   * Name of what the value of a node measures — the label of the tooltip row.
   * Without it the row is named by the data key the value came from, which is
   * the name of a column, not of a measure.
   */
  name?: string;
  tooltip?: Switchable & {
    renderer?: (params: TooltipParams) => TooltipContentData | string;
  };
}

interface HitRect {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

/** Base for axis-less series: shared rectangle-based hit testing. */
export abstract class StandaloneSeries<
  O extends StandaloneSeriesBaseOptions<never> = StandaloneSeriesBaseOptions,
> implements StandaloneSeriesInstance {
  abstract readonly type: string;
  visible: boolean;
  protected data: Datum[] = [];
  protected lastCtx: StandaloneRenderContext | undefined;
  protected hits: HitRect[] = [];

  constructor(
    readonly options: O,
    protected readonly env: SeriesEnv,
  ) {
    this.visible = options.visible !== false;
  }

  get id(): string {
    return this.options.id ?? this.env.id;
  }

  setData(data: Datum[]): void {
    this.data = data;
  }

  protected colorFor(index: number): ColorValue {
    const fills = this.options.fills ?? this.env.theme.palette.fills;
    return fills[index % fills.length] ?? this.env.colors.fill;
  }

  protected registerHit(index: number, x: number, y: number, width: number, height: number): void {
    this.hits.push({ index, x, y, width, height, anchorX: x + width / 2, anchorY: y });
  }

  abstract update(ctx: StandaloneRenderContext): void;
  abstract tooltipFor(datumIndex: number): TooltipContentData;

  /**
   * The tooltip of one node: the renderer of the series when it has one, and
   * otherwise the name of the node over its value and its share of the whole.
   * `valueField` names the row only as a last resort — a data key is the name
   * of a column, so `name` is what a measure should be called.
   */
  protected nodeTooltip(node: {
    datum?: Datum;
    label: string;
    value: number;
    /** Share of the chart total, 0..1; undefined when there is no total to compare against. */
    share?: number;
    /** Data key the value came from — the fallback name of the row. */
    valueField: string;
    color: ColorValue;
  }): TooltipContentData {
    // the base contract: a series with params of its own overrides tooltipFor too
    const renderer = this.options.tooltip?.renderer as ((params: NodeTooltipRendererParams) => TooltipContentData | string) | undefined;
    if (renderer) {
      return tooltipContentOf(
        renderer({ datum: node.datum, label: node.label, value: node.value, share: node.share ?? 0, color: node.color }),
      );
    }
    return partTooltip({
      heading: node.label,
      label: this.options.name ?? node.valueField,
      value: node.value,
      share: node.share,
      color: node.color,
    });
  }

  /**
   * What `tooltip.renderer` makes of a series that shows a single value — a
   * gauge has one number, so there is no node to describe. Undefined when no
   * renderer was given, which leaves the series to its own content.
   */
  protected renderedTooltip(value?: number): TooltipContentData | undefined {
    const renderer = this.options.tooltip?.renderer as ((params: NodeTooltipRendererParams) => TooltipContentData | string) | undefined;
    if (!renderer) return undefined;
    const shown = value ?? Number((this.options as { value?: unknown }).value ?? 0);
    return tooltipContentOf(
      renderer({ label: this.options.name ?? String(shown), value: shown, share: 0, color: this.colorFor(0) }),
    );
  }

  /**
   * The row a node came from. A flat series numbers its nodes the way its data
   * is numbered; a hierarchy numbers nested nodes too and says so by overriding
   * this.
   */
  datumAt(datumIndex: number): Datum | undefined {
    return this.data[datumIndex];
  }

  pick(x: number, y: number): SeriesPick | undefined {
    // reverse order: nested elements are drawn later and take priority
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const hit = this.hits[i];
      if (!hit) continue;
      if (x >= hit.x && x <= hit.x + hit.width && y >= hit.y && y <= hit.y + hit.height) {
        return { seriesId: this.id, datumIndex: hit.index, distance: 0, x: hit.anchorX, y: hit.anchorY };
      }
    }
    return undefined;
  }

  /** Nodes whose box overlaps the rubber band — a hierarchy is rectangles all the way down. */
  pickInRect(x0: number, y0: number, x1: number, y1: number): number[] {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    return this.hits
      .filter((hit) => hit.x < maxX && hit.x + hit.width > minX && hit.y < maxY && hit.y + hit.height > minY)
      .map((hit) => hit.index);
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const hit = this.hits.find((candidate) => candidate.index === datumIndex);
    if (!hit) return undefined;
    return { seriesId: this.id, datumIndex, distance: 0, x: hit.anchorX, y: hit.anchorY };
  }

  legendItems(): LegendItemDescriptor[] {
    return [];
  }
}
