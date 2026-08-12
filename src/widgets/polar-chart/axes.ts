/**
 * Axes of a polar chart. The web a radar or a rose is drawn on says the same
 * things a pair of cartesian axes says — these are the categories, these are
 * the values, this is what the numbers mean — so it takes the same settings:
 * a grid, a line, labels and a title, each falling back to the theme the way
 * `BaseAxis` does.
 */
import type { ThemeContext } from '@/shared/kernel';
import type { ColorValue, FontOptions, Fraction, Pixels, Switchable } from '@/shared/options';
import { formatValue } from '@/shared/util';

/**
 * A line inside the web: the rings of the value axis, the spokes of the category
 * one. The grid is chrome rather than an outline, so it takes the theme's grid
 * dash — dashed unless a theme or an option says otherwise.
 */
export interface PolarGridLineOptions extends Switchable {
  stroke?: ColorValue;
  width?: Pixels;
  /** Dash pattern; an empty array draws a solid line. The theme's grid dash by default. */
  lineDash?: Pixels[];
  /** How far the line fades back behind the data (0.3 by default). */
  opacity?: Fraction;
}

/**
 * The outline of an axis, drawn apart from the grid it encloses: the rim for the
 * categories, the vertical for the values. Solid unless a theme says otherwise.
 */
export interface PolarAxisLineOptions extends Switchable {
  stroke?: ColorValue;
  width?: Pixels;
  lineDash?: Pixels[];
}

export interface PolarAxisLabelParams {
  /** The tick of a value axis, or the category of an angle axis. */
  value: unknown;
  index: number;
}

export interface PolarAxisLabelOptions extends Switchable, FontOptions {
  /** Serializable format string (',.0f', '.0%'); ignored when a formatter is given. */
  format?: string;
  formatter?: (params: PolarAxisLabelParams) => string;
}

export interface PolarAxisTitleOptions extends Switchable, FontOptions {
  text?: string;
}

interface PolarAxisCommonOptions {
  gridLine?: PolarGridLineOptions;
  line?: PolarAxisLineOptions;
  label?: PolarAxisLabelOptions;
  title?: PolarAxisTitleOptions;
}

/**
 * The categories around the rim. Its grid is the spokes, its line is the rim
 * itself, and its title sits under the chart.
 */
export type PolarAngleAxisOptions = PolarAxisCommonOptions;

/**
 * The values along the radius. Its grid is the rings, its line is the vertical
 * they are measured along, and its title stands on the left edge.
 */
export interface PolarRadiusAxisOptions extends PolarAxisCommonOptions {
  /** Lower bound of the scale; the data decides when it is not given. */
  min?: number;
  /** Upper bound of the scale. */
  max?: number;
  /** Round the bounds out to whole steps (true by default). */
  nice?: boolean;
  /** How many rings the values are read off (4 by default). */
  ringCount?: number;
}

export interface PolarAxesOptions {
  /** Categories around the rim (radial-bar reads them along the radius). */
  angle?: PolarAngleAxisOptions;
  /** Value scale: the rings, and the numbers beside them. */
  radius?: PolarRadiusAxisOptions;
}

/** Rings the value axis is read off, unless the options asked for another count. */
export const DEFAULT_RING_COUNT = 4;
/** How far the web fades back behind the data it carries. */
const DEFAULT_GRID_OPACITY = 0.3;

export interface ResolvedGridLine {
  visible: boolean;
  stroke: ColorValue;
  width: Pixels;
  lineDash?: Pixels[];
  opacity: number;
}

/**
 * Style of a web line: the option first, then the theme's axis tokens, then the
 * plain axis colour — the cascade `BaseAxis` uses, so a theme that dresses one
 * chart dresses the other. The dash comes from the same token a cartesian grid
 * reads, which is how the web ends up dashed where a plot grid is.
 */
export function resolveGridLine(options: PolarGridLineOptions | undefined, theme: ThemeContext, opacity = DEFAULT_GRID_OPACITY): ResolvedGridLine {
  return {
    visible: options?.enabled ?? theme.axis.gridLine,
    stroke: options?.stroke ?? theme.axis.gridColor ?? theme.mutedColor,
    width: options?.width ?? theme.axis.strokeWidth,
    lineDash: options?.lineDash ?? theme.axis.gridDash,
    opacity: options?.opacity ?? opacity,
  };
}

export interface ResolvedAxisLine {
  visible: boolean;
  stroke: ColorValue;
  width: Pixels;
  lineDash?: Pixels[];
}

/**
 * Style of an axis outline. Whether it is there at all is the caller's to say:
 * the rim closes the web and follows the theme's axis-line switch, the vertical
 * inside it is asked for.
 */
export function resolveAxisLine(options: PolarAxisLineOptions | undefined, theme: ThemeContext, defaultVisible = false): ResolvedAxisLine {
  return {
    visible: options?.enabled ?? defaultVisible,
    stroke: options?.stroke ?? theme.axis.color ?? theme.axisColor,
    width: options?.width ?? theme.axis.strokeWidth,
    lineDash: options?.lineDash ?? theme.axis.lineDash,
  };
}

export interface ResolvedAxisText {
  visible: boolean;
  size: Pixels;
  family: string;
  weight: string;
  color: ColorValue;
}

/** Font and colour of the labels of an axis, over the theme's own defaults. */
export function resolveLabelStyle(options: PolarAxisLabelOptions | undefined, theme: ThemeContext, fallbackSize: Pixels): ResolvedAxisText {
  return {
    visible: options?.enabled !== false,
    size: options?.fontSize ?? theme.axis.labelSize ?? fallbackSize,
    family: options?.fontFamily ?? theme.fontFamily,
    weight: options?.fontWeight !== undefined ? String(options.fontWeight) : 'normal',
    color: options?.color ?? theme.axis.labelColor ?? theme.mutedColor,
  };
}

/** Font and colour of the title of an axis; invisible without text to print. */
export function resolveTitleStyle(options: PolarAxisTitleOptions | undefined, theme: ThemeContext, fallbackSize: Pixels): ResolvedAxisText {
  return {
    visible: options?.enabled !== false && (options?.text ?? '') !== '',
    size: options?.fontSize ?? theme.axis.titleSize ?? fallbackSize,
    family: options?.fontFamily ?? theme.fontFamily,
    weight: options?.fontWeight !== undefined ? String(options.fontWeight) : 'bold',
    color: options?.color ?? theme.axis.titleColor ?? theme.foregroundColor,
  };
}

/** Text of one label: the formatter, then the format string, then the value itself. */
export function axisLabelText(value: unknown, index: number, options: PolarAxisLabelOptions | undefined): string {
  const formatted = options?.formatter?.({ value, index });
  if (formatted !== undefined) return formatted;
  return options?.format !== undefined ? formatValue(options.format, value) : String(value);
}

/** Font spec of a resolved text style, for measuring. */
export function axisFont(style: ResolvedAxisText): string {
  return `${style.weight} ${style.size}px ${style.family}`;
}

/** Room the axis titles take out of the chart area: one under it, one to its left. */
export function titleInsets(
  angle: ResolvedAxisText,
  radius: ResolvedAxisText,
  gap: Pixels,
): { bottom: Pixels; left: Pixels } {
  return {
    bottom: angle.visible ? angle.size + gap : 0,
    left: radius.visible ? radius.size + gap : 0,
  };
}
