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

/** Free space a piece of chrome asks for outside a rect, side by side. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type MeasureText = (text: string, font: string) => number;

export type AxisPosition = 'top' | 'right' | 'bottom' | 'left';

/** Zoom window as fractions of the full domain. */
export type ZoomWindow = [start: number, end: number];

/** Which end of a domain something is measured from. */
export type DomainAnchor = 'start' | 'end';

/** Points at one datum of a series; without seriesId the first visible series answers. */
export interface NodeRef {
  seriesId?: string;
  datumIndex: number;
}

/** A datum the chart singled out — a selection entry or the target of a click. */
export interface SelectedNode {
  seriesId: string;
  datumIndex: number;
  datum: Datum;
}

/** Shared tail of the imperative calls: whether they notify listeners (they do by default). */
export interface ImperativeOptions {
  silent?: boolean;
}

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
  resetZoom(options?: ImperativeOptions): void;
  /**
   * The imperative half of the pointer handlers above: the same highlight,
   * tooltip, selection and zoom, addressed by datum instead of by coordinates.
   * A widget that leaves one out simply has nothing to drive that way.
   */
  showTooltip?(target: NodeRef): boolean;
  hideTooltip?(): void;
  /** Programmatic click: nodeClick and selection, exactly as a real one would. */
  clickNode?(target: NodeRef, options?: ImperativeOptions): boolean;
  getSelection?(): SelectedNode[];
  /** Replaces the selection; an empty list clears it. */
  setSelection?(targets: NodeRef[], options?: ImperativeOptions): void;
  zoomTo?(window: { x?: ZoomWindow; y?: ZoomWindow }, options?: ImperativeOptions): void;
  /** Window sized to a number of items, as zoom.visibleCount does at startup. */
  zoomToCount?(count: number, options?: ImperativeOptions & { anchor?: DomainAnchor }): void;
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

/** Tooltip heading: text with an optional series marker before it. */
export interface TooltipHeading {
  text: string;
  /** Colour of the marker before the text; without it the heading renders as plain text. */
  color?: ColorValue;
}

export interface TooltipContentData {
  heading?: string | TooltipHeading;
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

/** Anchor, alignment and font of a label — everything its box follows from. */
export interface LabelBox {
  text: string;
  x: number;
  y: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  fontSize: number;
  /** Canvas font spec of the label: `${weight} ${size}px ${family}`. */
  font: string;
  /**
   * Size of the box when the text does not describe it: a pie sector label is
   * several runs over two lines, and only the series knows how big it came out.
   */
  width?: number;
  height?: number;
}

/**
 * Room the value labels have already taken in the frame. A series that avoids
 * overlap asks before it draws: a box running into one already taken is
 * refused, and its label is left out. Series are asked in drawing order, so
 * the first label on a spot keeps it.
 */
export interface LabelGuard {
  admits(box: LabelBox): boolean;
}

/** Stack segment: accumulated lower/upper values by data index. */
export interface StackSegment {
  y0: number[];
  y1: number[];
}

/**
 * Where a series puts its marks: the same geometry serves rendering and the
 * measurement of labels during layout, before there is anything to render.
 */
export interface CartesianGeometry {
  data: Datum[];
  xScale: AnyScale;
  yScale: AnyScale;
  /** true — the category is on the vertical axis (horizontal bars). */
  swapped: boolean;
  plot: LayoutRect;
  /** For stacked series: the precomputed stack segment. */
  stack?: StackSegment;
  /** For grouped series: position within the group. */
  group?: { index: number; count: number };
}

/** Layout-time query: how far do the value labels reach outside the plot rect. */
export interface LabelOverflowContext extends CartesianGeometry {
  measureText: MeasureText;
}

export interface CartesianRenderContext extends CartesianGeometry {
  layer: Group;
  /**
   * Layer above every series' marks for the value labels: a bar drawn later
   * must not cover the label of the one before it. Falls back to layer.
   */
  labelLayer?: Group;
  /** Room the labels of the frame have taken (label.avoidOverlap); without it nothing is hidden. */
  labelGuard?: LabelGuard;
  highlight?: HighlightState;
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
  /**
   * Value fields the series reads — matched against an axis' `keys` to decide
   * which value axis it belongs to. The series id matches too, so two series
   * over one field can still be told apart.
   */
  axisKeys?(): string[];
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
   * How far the value labels reach outside the plot rect — the layout keeps
   * that much room for them. Without the method the series is assumed to draw
   * everything inside the plot.
   */
  labelOverflow?(ctx: LabelOverflowContext): Insets;
  /**
   * Finds the node under the cursor; called after update.
   * searchRadius: 0 — exact hit only, Infinity — nearest with no limit.
   */
  pick(x: number, y: number, searchRadius?: number): SeriesPick | undefined;
  /**
   * pick() run backwards: the node of a datum, wherever it ended up. Drives the
   * tooltip and highlight when they are addressed by datum rather than by cursor.
   */
  nodeAt?(datumIndex: number): SeriesPick | undefined;
  /** Indices of datums whose nodes fall inside the rectangle (Data Selection). */
  pickInRect?(x0: number, y0: number, x1: number, y1: number): number[];
  /** mode 'shared' — the rows go into a combined multi-series tooltip, so each row needs its own marker. */
  tooltipFor(datumIndex: number, mode?: 'single' | 'shared'): TooltipContentData;
  legendItems(): LegendItemDescriptor[];
  /**
   * The data, handed over before the layout: a series whose legend items come
   * out of the data (histogram groups) has to name them before anything draws.
   */
  setData?(data: Datum[]): void;
  /**
   * Toggles one item of a series that puts several in the legend — those items
   * are addressed as `<seriesId>#<index>`.
   */
  toggleItem?(index: number): void;
}

export interface SeriesColors {
  fill: ColorValue;
  stroke: ColorValue;
}

export interface CartesianAxisInstance {
  readonly type: string;
  readonly position: AxisPosition;
  readonly scale: AnyScale;
  /** Value fields (or series ids) this axis carries; undefined — it takes whatever is left. */
  readonly keys?: readonly string[];
  setDomain(domain: unknown[]): void;
  /** Binds the scale range to the plot rect (orientation per position/type). */
  layout(plot: LayoutRect): void;
  /** Thickness of the axis zone (labels + ticks + title); call after layout. */
  measure(measureText: MeasureText): number;
  /**
   * How far the labels reach past the ends of the plot rect: half of the
   * outermost label on a horizontal axis, half a line on a vertical one.
   * Call after layout.
   */
  labelOverflow?(measureText: MeasureText, plot: LayoutRect): Insets;
  /**
   * Renders the axis into axisLayer and grid lines into gridLayer;
   * foregroundLayer sits above the series and carries inside labels.
   */
  render(axisLayer: Group, gridLayer: Group, plot: LayoutRect, foregroundLayer?: Group): void;
}
