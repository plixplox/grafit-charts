/** Contracts of the polar family (pie/donut/radar/radial). */
import type {
  HighlightState,
  LabelGuard,
  LayoutRect,
  LegendItemDescriptor,
  MeasureText,
  SelectionStyleContext,
  SeriesPick,
  TooltipContentData,
} from './cartesian';
import type { Datum } from '@/shared/options';
import type { BandScale, LinearScale } from '@/shared/scale';
import type { Group } from '@/shared/scene';

export interface PolarRenderContext {
  data: Datum[];
  centerX: number;
  centerY: number;
  /** Available outer radius. */
  radius: number;
  /** Area the chart may cover, labels included — the rim has to stay inside it. */
  area: LayoutRect;
  measureText: MeasureText;
  layer: Group;
  /** Room the labels of the frame have taken (label.avoidOverlap); without it nothing is hidden. */
  labelGuard?: LabelGuard;
  highlight?: HighlightState;
  animationT?: number;
  /** Opacity of the other series while highlighting. */
  dimOpacity?: number;
  /** Highlight animation factor 0..1 (sector pop-out etc.). */
  highlightT?: number;
  /** Previous highlight when switching between nodes (slides back in). */
  fadeHighlight?: HighlightState;
  fadeHighlightT?: number;
  /** Layout transition factor (sector toggle via the legend), 0..1. */
  transitionT?: number;
  /** Data selection: selected datums of the series, selection-active flag and styles. */
  selected?: ReadonlySet<number>;
  selectionActive?: boolean;
  selectionStyle?: SelectionStyleContext;
  /** Angle categories (radar/radial); radians per category come from the band scale. */
  angleScale?: BandScale<unknown>;
  /** Radius values (radar/radial). */
  radiusScale?: LinearScale;
  /** For grouped radial series: position within the band slot. */
  group?: { index: number; count: number };
  /** Inverse layout (radial-bar): category along the radius, value along the angle. */
  radiusBandScale?: BandScale<unknown>;
  angleValueScale?: LinearScale;
}

export interface PolarSeriesInstance {
  readonly id: string;
  readonly type: string;
  visible: boolean;
  /** Hands the data over before layout (the pie legend needs it before the first update). */
  setData(data: Datum[]): void;
  /** Whether the polar grid is needed (radar/radial); pie/donut — no. */
  needsPolarAxes(): boolean;
  /** Whether the series shares the angular band with others (radial-column). */
  occupiesAngleSlot(): boolean;
  /** Layout: category along the angle (default) or along the radius (radial-bar). */
  polarLayout?(): 'angle-category' | 'radius-category';
  /** Toggles visibility of a series item (a pie sector from the legend). */
  toggleItem?(index: number): void;
  /**
   * Restores which items are switched off. Series are rebuilt on every update,
   * so without this a legend filter would last only until the next one.
   */
  setHiddenItems?(hidden: ReadonlySet<number>): void;
  /** Angle categories (for the angle scale and grid labels). */
  angleValues(data: Datum[]): unknown[];
  /** Radius value domain. */
  radiusDomain(data: Datum[]): [number, number] | undefined;
  update(ctx: PolarRenderContext): void;
  pick(x: number, y: number, searchRadius?: number): SeriesPick | undefined;
  /** Marks inside a rubber band, for selection.boxSelect. */
  pickInRect?(x0: number, y0: number, x1: number, y1: number): number[];
  /** pick() run backwards: the node of a datum, for tooltips addressed by index. */
  nodeAt?(datumIndex: number): SeriesPick | undefined;
  /** `shared` asks for the row of this series alone — the widget stacks them into one tooltip. */
  tooltipFor(datumIndex: number, mode?: 'single' | 'shared'): TooltipContentData;
  legendItems(): LegendItemDescriptor[];
}
