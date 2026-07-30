import { BUILT_IN, THEME_NAMES, type ThemeName } from './presets';
import type { ThemeContext } from '@/shared/kernel';
import { deepMerge, type DeepPartial } from '@/shared/options';
import type { ColorValue, Fraction, Pixels } from '@/shared/options';

export { THEME_NAMES };
export type { ThemeName };

/** The theme with every token resolved. One definition, declared in the kernel. */
export type ResolvedTheme = ThemeContext;

/** Axis chrome tokens — the one block `overrides` cannot reach, since `axes` is an array. */
export interface ThemeAxisOptions {
  /** The axis line. */
  line?: boolean;
  /** Tick marks; off unless a theme or an axis turns them on. */
  tick?: boolean;
  /** Grid lines. */
  gridLine?: boolean;
  /** Thickness of the axis line, the ticks and the grid. */
  strokeWidth?: Pixels;
  /** Grid dash pattern; an empty array draws a solid line. */
  gridDash?: Pixels[];
  /** Colour of the axis line alone; defaults to `params.axisColor`. */
  color?: ColorValue;
  /** Dash pattern of the axis line itself; solid by default. */
  lineDash?: Pixels[];
  /** Colour of the grid alone; defaults to `params.axisColor`. */
  gridColor?: ColorValue;
  /** Colour of the ticks alone; defaults to `params.axisColor`. */
  tickColor?: ColorValue;
  /** Length of a tick mark (6). */
  tickSize?: Pixels;
  /** Tick label colour; defaults to `params.mutedColor`. */
  labelColor?: ColorValue;
  /** Tick label size; defaults to `params.fontSize`. */
  labelSize?: Pixels;
  /** Gap between the axis line and its labels (8). */
  labelSpacing?: Pixels;
  /** Axis title colour; defaults to `params.foregroundColor`. */
  titleColor?: ColorValue;
  /** Axis title size; defaults to one step above `params.fontSize`. */
  titleSize?: Pixels;
}

/** Flat design tokens; the keys mirror the resolved theme one to one. */
export interface ThemeParams {
  backgroundColor?: ColorValue;
  foregroundColor?: ColorValue;
  /** Secondary text: axis labels, the subtitle, legend values, tooltip rows. */
  mutedColor?: ColorValue;
  /** Axis lines, ticks and grid — light grey by default. */
  axisColor?: ColorValue;
  fontFamily?: string;
  /** Base label size (11). Every other size moves with it. */
  fontSize?: Pixels;
  /** Data line width — line/area/radar strokes, never a shape outline. */
  strokeWidth?: Pixels;
  /** Dash pattern of data lines; solid unless a series says otherwise. */
  lineDash?: Pixels[];
  /** Outline width of filled marks — bars, sectors, boxes. Not a data line. */
  markStrokeWidth?: Pixels;
  /** Corner rounding of every rectangular mark; unset keeps each mark's own default. */
  cornerRadius?: Pixels;
  /** Fill opacity of every filled mark; unset keeps each mark's own default. */
  fillOpacity?: Fraction;
  /** Growth and decline: candlesticks, OHLC bars, falling waterfall columns. */
  positiveColor?: ColorValue;
  negativeColor?: ColorValue;
}

/**
 * Custom theme: baseTheme + palette + params (design tokens) + axis chrome.
 */
export interface ThemeOptions {
  baseTheme?: ThemeName;
  palette?: {
    fills?: ColorValue[];
    strokes?: ColorValue[];
    /** Continuous ramp for colorField series (heatmap) and gradient legends. */
    sequential?: ColorValue[];
  };
  params?: ThemeParams;
  axis?: ThemeAxisOptions;
  /**
   * Partial options applied underneath user options:
   * common — chart-level blocks for all charts; seriesType.series — defaults
   * for series of that type.
   */
  overrides?: {
    common?: Record<string, unknown>;
  } & Record<string, { series?: Record<string, unknown> } | Record<string, unknown> | undefined>;
}

/**
 * Splices theme overrides underneath user options:
 * result = deepMerge(overrides, userOptions); series are matched by their type.
 */
export function applyThemeOverrides<T extends { theme?: unknown; series?: Array<{ type: string }> }>(options: T): T {
  const theme = options.theme;
  if (!theme || typeof theme === 'string') return options;
  const overrides = (theme as ThemeOptions).overrides;
  if (!overrides) return options;

  const { common, ...byType } = overrides;
  let result = options;
  if (common) {
    const chartLevel = { ...common };
    delete (chartLevel as { series?: unknown }).series;
    result = deepMerge(chartLevel as T, result as never);
  }
  if (result.series) {
    result = {
      ...result,
      series: result.series.map((series) => {
        const override = byType[series.type] as { series?: Record<string, unknown> } | undefined;
        const defaults = override?.series;
        return defaults ? deepMerge(defaults as typeof series, series as never) : series;
      }),
    };
  }
  return result;
}

/** A colour list is usable when it holds at least one non-empty string. */
function usableColors(colors: unknown): colors is ColorValue[] {
  return Array.isArray(colors) && colors.length > 0 && colors.every((color) => typeof color === 'string' && color.length > 0);
}

/**
 * Resolves a theme name or a theme object into the token set the renderers read.
 * A theme object is layered over its base with deepMerge: unset tokens fall
 * through, nested blocks merge field by field, and colour lists replace wholesale.
 */
export function resolveTheme(theme?: ThemeName | ThemeOptions): ResolvedTheme {
  if (theme === undefined || typeof theme === 'string') {
    return BUILT_IN[theme ?? 'default'] ?? BUILT_IN.default;
  }
  // an unknown name can arrive from imported JSON — fall back rather than throw
  const base = BUILT_IN[theme.baseTheme as ThemeName] ?? BUILT_IN.default;
  const merged = deepMerge<ResolvedTheme>(base, {
    ...theme.params,
    palette: theme.palette,
    axis: theme.axis,
  } as DeepPartial<ResolvedTheme>);

  const fills = usableColors(merged.palette.fills) ? merged.palette.fills : base.palette.fills;
  // strokes follow the fills a theme actually set, not the ones it inherited
  const ownStrokes = theme.palette?.strokes;
  const strokes = usableColors(ownStrokes) ? ownStrokes : usableColors(theme.palette?.fills) ? fills : base.palette.strokes;
  const sequential = usableColors(merged.palette.sequential) ? merged.palette.sequential : base.palette.sequential;
  return { ...merged, palette: { fills, strokes, sequential } };
}
