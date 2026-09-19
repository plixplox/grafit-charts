import type { ColorValue, Datum, Fraction, Pixels, Styler } from '@/shared/options';

/** What an item styler of a rectangular mark (a bar, a waterfall step) is handed. */
export interface RectItemStylerParams {
  datum: Datum;
  /** Index of the datum in the data of the series. */
  index: number;
  highlighted: boolean;
  /** The fill the item would have without the styler — from the series, the palette or the theme. */
  fill: ColorValue;
  stroke: ColorValue | undefined;
}

export interface RectItemStyle {
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  /** The value label of the item; it wins over `label.color` of the series. */
  label?: ItemLabelStyle;
}

/** What an item styler may say about the label of its item. */
export interface ItemLabelStyle {
  color?: ColorValue;
}

/** What every item styler is told about the state of its item, whatever else it is handed. */
interface StateParams {
  highlighted: boolean;
  fill: ColorValue;
  stroke?: ColorValue | undefined;
}

/** What an item styler of a sector (nightingale, radial column, radial bar) is handed. */
export type SectorItemStylerParams = RectItemStylerParams;

/** The style of one sector; a radial series has no value labels to colour. */
export type SectorItemStyle = Omit<RectItemStyle, 'label'>;

/** What an item styler of a marker (a scatter point, a point of a line) is handed. */
export interface MarkerItemStylerParams {
  datum: Datum;
  /** Index of the datum in the data of the series. */
  index: number;
  highlighted: boolean;
  fill: ColorValue;
  stroke: ColorValue | undefined;
  size: Pixels;
}

export interface MarkerItemStyle {
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  size?: Pixels;
  /** The label of the point; it wins over `label.color` of the series. */
  label?: ItemLabelStyle;
}

/** The highlighted style over the rest one; the label is merged, not replaced. */
function over<S extends { label?: ItemLabelStyle }>(rest: S, highlighted: S): S {
  const label = rest.label || highlighted.label ? { ...rest.label, ...highlighted.label } : undefined;
  return { ...rest, ...highlighted, ...(label ? { label } : {}) };
}

/**
 * The style an item styler gives one rectangle. A highlighted item is styled
 * twice: at rest first, then highlighted over that, with the colours it got
 * at rest — so a styler that only speaks for the rest state still colours the
 * item under the pointer, and one that answers `highlighted` builds on its own
 * colours rather than on the series'.
 */
export function styleRectItem<P extends StateParams>(styler: Styler<P, RectItemStyle> | undefined, params: P): RectItemStyle {
  if (!styler) return {};
  const rest = styler({ ...params, highlighted: false }) ?? {};
  if (!params.highlighted) return rest;
  const highlighted = styler({ ...params, fill: rest.fill ?? params.fill, stroke: rest.stroke ?? params.stroke }) ?? {};
  return over(rest, highlighted);
}

/**
 * The style an item styler gives one marker; `params.size` is its size at
 * rest. A highlighted marker grows by `grow` from the size the styler gave it
 * at rest, and is styled over its rest look like a rectangle is.
 */
export function styleMarkerItem<P extends MarkerItemStylerParams>(
  styler: Styler<P, MarkerItemStyle> | undefined,
  params: P,
  grow: number,
): MarkerItemStyle & { size: Pixels } {
  const rest = styler?.({ ...params, highlighted: false }) ?? {};
  const restSize = rest.size ?? params.size;
  if (!params.highlighted) return { ...rest, size: restSize };
  const grown = restSize * grow;
  const highlighted = styler?.({ ...params, fill: rest.fill ?? params.fill, stroke: rest.stroke ?? params.stroke, size: grown }) ?? {};
  return { ...over(rest, highlighted), size: highlighted.size ?? grown };
}

/**
 * The style of an item whose highlight is a colour of its own — a treemap tile
 * or a sunburst sector lifts towards its contrast under the pointer. It is
 * styled like a rectangle, and the lift is laid over whatever colour comes
 * out, so a styler that never looks at `highlighted` still shows the pointer.
 */
export function styleLiftedItem<P extends StateParams, S extends { fill?: ColorValue; label?: ItemLabelStyle }>(
  styler: Styler<P, S> | undefined,
  params: P,
  lift: (fill: ColorValue) => ColorValue,
): S & { fill: ColorValue } {
  const rest = styler?.({ ...params, highlighted: false }) ?? ({} as S);
  const restFill = rest.fill ?? params.fill;
  if (!params.highlighted) return { ...rest, fill: restFill };
  const highlighted = styler?.({ ...params, fill: restFill }) ?? ({} as S);
  return { ...over(rest, highlighted), fill: lift(highlighted.fill ?? restFill) };
}

/**
 * What the item styler of a treemap or a sunburst is handed: any node of the
 * tree, a branch as much as a leaf. The color a branch is styled with is the
 * `fill` its children are handed, so painting a branch paints all of it.
 */
export interface HierarchyItemStylerParams {
  datum: Datum;
  /** Index of the node, counted the way events and the tooltip count them — depth first. */
  index: number;
  /** Name of the node (labelField). */
  label: string;
  /** 0 for the roots. */
  depth: number;
  /** Size of the node: its own for a leaf, the sum of its children for a branch. */
  value: number;
  /** Share of the chart total, 0..1. */
  share: number;
  /** Whether the node has no children. */
  leaf: boolean;
  highlighted: boolean;
  /** The color the node would have without the styler: its parent's, or the palette's for a root. */
  fill: ColorValue;
}

export interface HierarchyItemStyle {
  fill?: ColorValue;
  /** The label of the node; it wins over `label.color` of the series. */
  label?: ItemLabelStyle;
}
