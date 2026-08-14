/** Contracts of axis-less series (hierarchy: treemap/sunburst/pyramid; flow: sankey/chord). */
import type {
  HighlightState,
  LabelGuard,
  MeasureText,
  LayoutRect,
  LegendItemDescriptor,
  SelectionStyleContext,
  SeriesPick,
  TooltipContentData,
} from './cartesian';
import type { Datum } from '@/shared/options';
import type { Group } from '@/shared/scene';

export interface StandaloneRenderContext {
  data: Datum[];
  plot: LayoutRect;
  layer: Group;
  /** Text measurement of the frame — a label block sizes itself with it. */
  measureText: MeasureText;
  highlight?: HighlightState;
  animationT?: number;
  /** Room already taken by labels; a series with label.avoidOverlap on asks it first. */
  labelGuard?: LabelGuard;
  /** Selected datums of this series (Data Selection). */
  selected?: ReadonlySet<number>;
  /** Whether the chart has an active selection (to fade the unselected marks). */
  selectionActive?: boolean;
  /** Appearance of selected/unselected marks. */
  selectionStyle?: SelectionStyleContext;
}

export interface StandaloneSeriesInstance {
  readonly id: string;
  readonly type: string;
  visible: boolean;
  setData(data: Datum[]): void;
  /**
   * The numeric fields the series sizes its nodes by — a row entering an update
   * grows out of their base instead of appearing at full size.
   */
  valueFields?(): string[];
  update(ctx: StandaloneRenderContext): void;
  pick(x: number, y: number): SeriesPick | undefined;
  /** Nodes inside a rubber band, for selection.boxSelect. */
  pickInRect?(x0: number, y0: number, x1: number, y1: number): number[];
  /** pick() run backwards: the node of a datum, for tooltips addressed by index. */
  nodeAt?(datumIndex: number): SeriesPick | undefined;
  /**
   * The row a node came from. A hierarchy numbers every node it draws, nested
   * ones included, so the index of a node is not the index of a row in the data
   * of the chart — only the series knows which row a node stands for.
   */
  datumAt?(datumIndex: number): Datum | undefined;
  tooltipFor(datumIndex: number): TooltipContentData;
  legendItems(): LegendItemDescriptor[];
}
