/**
 * Cartesian family contracts: what widgets/cartesian-chart requires
 * from series and axis modules without knowing their concrete types.
 */
import type { ColorValue, Datum } from '@/shared/options';
import type { AnyScale } from '@/shared/scale';
import type { Group } from '@/shared/scene';

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AxisPosition = 'top' | 'right' | 'bottom' | 'left';

/** Zoom window as fractions of the full domain. */
export type ZoomWindow = [start: number, end: number];

/** Serializable chart state (zoom + hidden series). */
export interface ChartState {
  zoom?: { x?: ZoomWindow; y?: ZoomWindow };
  hiddenSeries?: string[];
}

/** Pointer modifiers (structurally compatible with shared/interaction). */
export interface PointerModifiersLike {
  alt: boolean;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
}

/** Chart widget contract — shared by the cartesian/polar families. */
export interface ChartWidget {
  layoutAndRender(): void;
  handlePointerMove(x: number, y: number): void;
  handlePointerLeave(): void;
  handleClick(x: number, y: number): void;
  handleDoubleClick(): void;
  handleWheel(x: number, y: number, deltaY: number, preventDefault: () => void): void;
  handleDragStart(x: number, y: number, modifiers?: PointerModifiersLike): void;
  handleDragMove(x: number, y: number, dx: number, dy: number): void;
  handleDragEnd(x?: number, y?: number): void;
  /** Pinch zoom (touch). */
  handlePinch?(x: number, y: number, scale: number): void;
  getState(): ChartState;
  setState(state: ChartState): void;
  isZoomed(): boolean;
  resetZoom(): void;
  /** Keyboard navigation across points (a11y). */
  handleKeyStep?(delta: number): void;
  /** Description of the currently highlighted point for the ARIA live region. */
  describeHighlight?(): string | undefined;
  destroy(): void;
}

export interface HighlightState {
  seriesId: string;
  datumIndex: number;
  /** Shared tooltip: highlight the category's node in all series (no dimming). */
  allSeries?: boolean;
}

export interface SeriesPick {
  seriesId: string;
  datumIndex: number;
  /** Distance from the cursor to the node (px) — used to pick the nearest series. */
  distance: number;
  /** Anchor point of the node — the tooltip is positioned here. */
  x: number;
  y: number;
  /** Node center (for tooltip.position.anchorTo: 'center'). */
  centerX?: number;
  centerY?: number;
}

export interface TooltipRow {
  label: string;
  value: string;
  color?: ColorValue;
}

export interface TooltipContentData {
  heading?: string;
  rows: TooltipRow[];
}

export interface LegendItemDescriptor {
  seriesId: string;
  label: string;
  color: ColorValue;
  visible: boolean;
  /** Value to the right of the label ("label … value"). */
  value?: string;
}

/** Stack segment: accumulated lower/upper values by data index. */
export interface StackSegment {
  y0: number[];
  y1: number[];
}

export interface CartesianRenderContext {
  data: Datum[];
  xScale: AnyScale;
  yScale: AnyScale;
  /** true — the category is on the vertical axis (horizontal bars). */
  swapped: boolean;
  plot: LayoutRect;
  layer: Group;
  highlight?: HighlightState;
  /** For stacked series: the precomputed stack segment. */
  stack?: StackSegment;
  /** For grouped series: position within the group. */
  group?: { index: number; count: number };
  /** Entry animation factor 0..1 (1 — no animation). */
  animationT?: number;
  /** Opacity of the other series while highlighting (highlight.dimOpacity). */
  dimOpacity?: number;
  /** Selected datums of this series (Data Selection). */
  selected?: ReadonlySet<number>;
  /** Whether the chart has an active selection (to dim unselected nodes). */
  selectionActive?: boolean;
  /** Appearance of selected/unselected nodes. */
  selectionStyle?: SelectionStyleContext;
}

/** Data Selection styles passed to series. */
export interface SelectionStyleContext {
  stroke?: ColorValue;
  strokeWidth?: number;
  sizeRatio?: number;
  inactiveOpacity?: number;
}

/** Default dimming of non-highlighted series. */
export const DEFAULT_DIM_OPACITY = 0.8;

/** Description of a series' color scale — for the gradient legend. */
export interface ColorScaleInfo {
  min: number;
  max: number;
  colors: ColorValue[];
}

export interface CartesianSeriesInstance {
  readonly id: string;
  readonly type: string;
  visible: boolean;
  /** Preferred X axis type for default axes (when axes are not provided). */
  preferredXAxisType?(): 'number' | 'category' | 'time';
  /** Preferred Y axis type (heatmap — category). */
  preferredYAxisType?(): 'number' | 'category' | 'time';
  /** The series renders without axes (funnel). */
  hidesAxes?(): boolean;
  /** The series prefers axes without lines and ticks (heatmap): labels only. */
  prefersBareAxes?(): boolean;
  /** Values along the Y direction for a categorical Y axis (heatmap). */
  yValues?(data: Datum[]): unknown[];
  /** The series' color scale (heatmap) — for the gradient legend. */
  colorScaleInfo?(): ColorScaleInfo | undefined;
  /** Values along the category/X axis — used to build the domain. */
  xValues(data: Datum[]): unknown[];
  /** Numeric value domain (accounting for the stack, if provided). */
  yDomain(data: Datum[], stack?: StackSegment): [number, number] | undefined;
  /** Whether the series participates in stacking and in which group. */
  stackParticipation(): { key: string; stackGroup: string; normalizedTo?: number } | undefined;
  /** Whether the series occupies a slot in band grouping (bar). */
  occupiesBandSlot(): boolean;
  update(ctx: CartesianRenderContext): void;
  /**
   * Finds the node under the cursor; called after update.
   * searchRadius: 0 — exact hit only, Infinity — nearest with no limit.
   */
  pick(x: number, y: number, searchRadius?: number): SeriesPick | undefined;
  /** Indices of datums whose nodes fall inside the rectangle (Data Selection). */
  pickInRect?(x0: number, y0: number, x1: number, y1: number): number[];
  tooltipFor(datumIndex: number): TooltipContentData;
  legendItems(): LegendItemDescriptor[];
}

export interface SeriesColors {
  fill: ColorValue;
  stroke: ColorValue;
}

export interface CartesianAxisInstance {
  readonly type: string;
  readonly position: AxisPosition;
  readonly scale: AnyScale;
  setDomain(domain: unknown[]): void;
  /** Binds the scale range to the plot rect (orientation per position/type). */
  layout(plot: LayoutRect): void;
  /** Thickness of the axis zone (labels + ticks + title); call after layout. */
  measure(measureText: (text: string, font: string) => number): number;
  /** Renders the axis into axisLayer and grid lines into gridLayer. */
  render(axisLayer: Group, gridLayer: Group, plot: LayoutRect): void;
}
