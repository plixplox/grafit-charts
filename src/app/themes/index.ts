import { deepMerge } from '@/shared/options';
import type { ColorValue } from '@/shared/options';

export type ThemeName = 'default' | 'dark';

/**
 * Custom theme: baseTheme + palette + params (design tokens).
 * Full schema (per-series-type overrides) — phase 1.
 */
export interface ThemeOptions {
  baseTheme?: ThemeName;
  palette?: {
    fills?: ColorValue[];
    strokes?: ColorValue[];
  };
  params?: {
    backgroundColor?: ColorValue;
    foregroundColor?: ColorValue;
    /** Axis lines, ticks and grid — light grey by default. */
    axisColor?: ColorValue;
    fontFamily?: string;
  };
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

export interface ResolvedTheme {
  backgroundColor: ColorValue;
  foregroundColor: ColorValue;
  mutedColor: ColorValue;
  /** Axis chrome: the axis line, ticks and grid lines. */
  axisColor: ColorValue;
  fontFamily: string;
  palette: {
    fills: ColorValue[];
    strokes: ColorValue[];
  };
}

const FILLS = ['#3d72e8', '#8f6fe8', '#f4a236', '#1ac0c6', '#f45d8a', '#7bc043'];

const BUILT_IN: Record<ThemeName, ResolvedTheme> = {
  default: {
    backgroundColor: '#ffffff',
    foregroundColor: '#1f2733',
    mutedColor: '#7a8190',
    axisColor: '#d9dde3',
    fontFamily: 'system-ui, sans-serif',
    palette: { fills: FILLS, strokes: FILLS },
  },
  dark: {
    backgroundColor: '#15181c',
    foregroundColor: '#e8eaed',
    mutedColor: '#8b919c',
    axisColor: '#343a43',
    fontFamily: 'system-ui, sans-serif',
    palette: { fills: FILLS, strokes: FILLS },
  },
};

export function resolveTheme(theme?: ThemeName | ThemeOptions): ResolvedTheme {
  if (theme === undefined || typeof theme === 'string') {
    return BUILT_IN[theme ?? 'default'];
  }
  const base = BUILT_IN[theme.baseTheme ?? 'default'];
  return {
    backgroundColor: theme.params?.backgroundColor ?? base.backgroundColor,
    foregroundColor: theme.params?.foregroundColor ?? base.foregroundColor,
    mutedColor: base.mutedColor,
    axisColor: theme.params?.axisColor ?? base.axisColor,
    fontFamily: theme.params?.fontFamily ?? base.fontFamily,
    palette: {
      fills: theme.palette?.fills ?? base.palette.fills,
      strokes: theme.palette?.strokes ?? theme.palette?.fills ?? base.palette.strokes,
    },
  };
}
