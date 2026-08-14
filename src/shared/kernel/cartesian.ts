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
/**
 * What an index addresses in a series that does not count data rows. A
 * histogram counts bars — bin by bin, group within bin — so the row a listener
 * would otherwise reach for belongs to nobody in particular; the bin does.
 */
export interface SeriesNodeInfo {
  /** What the index counts: `'bin'` for a histogram. */
  kind: string;
  /** Bounds of a binned node. */
  x0?: number;
  x1?: number;
  /** Value of the series' `groupField` for this node. */
  group?: unknown;
  /** Rows behind the node. */
  count?: number;
  /** The height the node draws, and the aggregate it came from. */
  value?: number;
  raw?: number;
}

export interface SelectedNode {
  seriesId: string;
  datumIndex: number;
  /** The data row — absent where the index addresses no single row. */
  datum?: Datum;
  /** What it addresses instead: a bin of a histogram, say. */
  node?: SeriesNodeInfo;
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

/** What a widget is told about a frame of an update transition beyond its rows. */
export interface DataFrame {
  /** The rows the update arrives at — what the value axis is scaled by meanwhile. */
  settled?: Datum[];
  /** How much of a band each row takes, 0..1, row by row. */
  weights?: number[];
  /** How far the update has travelled, 0..1 — what the value axis walks its bounds by. */
  t?: number;
}

/** Chart widget contract — shared by the cartesian/polar families. */
export interface ChartWidget {
  layoutAndRender(): void;
  /**
   * New rows and nothing else, for a frame of an update transition. setOptions
   * builds the series, the axes and the legend again, which is the right price
   * for new options and far too much to pay sixty times a second while the data
   * flows into place.
   *
   * `settled` is where the data is going. The value axis is scaled by that
   * rather than by rows still on their way: a domain read off a moving frame is
   * rounded to a new set of ticks every so often, and each of those steps moves
   * every mark on the chart at once — the jerk being far larger than the motion
   * it interrupts. `weights` is how much of a band each row takes, for the rows
   * arriving and leaving.
   */
  setData?(data: Datum[], frame?: DataFrame): void;
  /**
   * Fields the series of the chart read as values — the base a row entering an
   * update grows from, and the one a row leaving sinks back to.
   */
  valueFields?(): string[];
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
  /**
   * Step of the data along the category direction, in axis units — the width a
   * bar takes where the axis is continuous (time, number) and has no bands of
   * its own. The chart measures it across every visible series, so grouped bars
   * share one band; undefined on a band axis, which knows its own width.
   */
  bandSpan?: number;
}

/** Layout-time query: how far do the value labels reach outside the plot rect. */
export interface LabelOverflowContext extends CartesianGeometry {
  measureText: MeasureText;
}

export interface CartesianRenderContext extends CartesianGeometry {
  layer: Group;
  /** Text measurement of the frame — a label block sizes itself with it. */
  measureText: MeasureText;
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
  /**
   * The numeric fields of a row, for the base an update transition grows a new
   * row out of. Usually the axis keys — a series drawn without an axis of its
   * own (a funnel) names its value here and nowhere else.
   */
  valueFields?(): string[];
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
  /**
   * Restores which of those items are switched off. Series are rebuilt on every
   * update, so without this a legend filter would last only until the next one.
   */
  setHiddenItems?(hidden: ReadonlySet<number>): void;
  /**
   * What a datum index addresses, for a series that counts something other than
   * data rows. A series without this method addresses rows, and its listeners
   * get the row itself.
   */
  nodeInfo?(datumIndex: number): SeriesNodeInfo | undefined;
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
  /**
   * Band width in axis units the options asked for — a continuous axis carrying
   * bars. Without it the chart measures the step off the data.
   */
  readonly bandSpan?: number;
  /**
   * Why the domain the axis was handed came to nothing: dates that parse to
   * nothing collapse a time axis, and a chart drawn over that domain is empty
   * without being wrong anywhere. Set during setDomain, read by the chart.
   */
  readonly domainError?: string;
  /**
   * `weights` says how much of a band each value of the domain takes, 0..1,
   * where they are not all the same — a category arriving or leaving during an
   * update transition. An axis without bands has nothing to do with them.
   */
  setDomain(domain: unknown[], weights?: number[]): void;
  /**
   * The bounds of a frame partway through an update: they walk from the ones
   * the axis stood at to the ones the data arrives at, so the scale never
   * changes gear under the marks drawn on it. The ticks stay those of the
   * settled domain — labels recomputed frame by frame would print numbers
   * nobody chose. A factor of 1 ends the walk. Only a numeric axis has bounds
   * to walk between.
   */
  setTransitionDomain?(from: [number, number], t: number): void;
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
