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
export function styleRectItem<P extends RectItemStylerParams>(styler: Styler<P, RectItemStyle> | undefined, params: P): RectItemStyle {
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
export function styleMarkerItem(
  styler: Styler<MarkerItemStylerParams, MarkerItemStyle> | undefined,
  params: MarkerItemStylerParams,
  grow: number,
): MarkerItemStyle & { size: Pixels } {
  const rest = styler?.({ ...params, highlighted: false }) ?? {};
  const restSize = rest.size ?? params.size;
  if (!params.highlighted) return { ...rest, size: restSize };
  const grown = restSize * grow;
  const highlighted = styler?.({ ...params, fill: rest.fill ?? params.fill, stroke: rest.stroke ?? params.stroke, size: grown }) ?? {};
  return { ...over(rest, highlighted), size: highlighted.size ?? grown };
}
