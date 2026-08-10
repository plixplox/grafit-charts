import type { ThemeContext } from '@/shared/kernel';
import type { ColorValue, Pixels } from '@/shared/options';

export type ThemeName = 'default' | 'dark' | 'vibrant' | 'muted' | 'mono' | 'contrast' | 'midnight';

/** Every built-in theme, in menu order — ready to populate a `<select>`. */
export const THEME_NAMES: readonly ThemeName[] = ['default', 'dark', 'vibrant', 'muted', 'mono', 'contrast', 'midnight'];

/** Grid lines read as a backdrop, not as data. */
const DASHED_GRID: Pixels[] = [4, 4];

const AXIS_DEFAULTS: ThemeContext['axis'] = {
  line: true,
  tick: false,
  gridLine: true,
  strokeWidth: 1,
  gridDash: DASHED_GRID,
};

/** Palette of the original light/dark pair — frozen for backwards compatibility. */
const FILLS = ['#3d72e8', '#8f6fe8', '#f4a236', '#1ac0c6', '#f45d8a', '#7bc043'];

const SEQUENTIAL = ['#dbe6ff', '#1d4fd7'];

const UP = '#21a06c';
const DOWN = '#e5484d';

/**
 * Shared skeleton: only the tokens a theme is expected to restate are left out.
 * `cornerRadius` and `fillOpacity` stay undefined everywhere by design — a theme
 * that pins them would flatten deliberate per-mark differences.
 */
function theme(tokens: {
  fills: ColorValue[];
  strokes?: ColorValue[];
  sequential?: ColorValue[];
  backgroundColor: ColorValue;
  foregroundColor: ColorValue;
  mutedColor: ColorValue;
  axisColor: ColorValue;
  positiveColor?: ColorValue;
  negativeColor?: ColorValue;
  fontFamily?: string;
  fontSize?: Pixels;
  strokeWidth?: Pixels;
  axis?: Partial<ThemeContext['axis']>;
}): ThemeContext {
  return {
    backgroundColor: tokens.backgroundColor,
    foregroundColor: tokens.foregroundColor,
    mutedColor: tokens.mutedColor,
    axisColor: tokens.axisColor,
    fontFamily: tokens.fontFamily ?? 'system-ui, sans-serif',
    fontSize: tokens.fontSize ?? 11,
    strokeWidth: tokens.strokeWidth ?? 2,
    positiveColor: tokens.positiveColor ?? UP,
    negativeColor: tokens.negativeColor ?? DOWN,
    palette: {
      fills: tokens.fills,
      strokes: tokens.strokes ?? tokens.fills,
      sequential: tokens.sequential ?? SEQUENTIAL,
    },
    axis: { ...AXIS_DEFAULTS, ...tokens.axis },
  };
}

export const BUILT_IN: Record<ThemeName, ThemeContext> = {
  default: theme({
    fills: FILLS,
    backgroundColor: '#ffffff',
    foregroundColor: '#1f2733',
    mutedColor: '#7a8190',
    axisColor: '#d9dde3',
  }),
  dark: theme({
    fills: FILLS,
    backgroundColor: '#181612',
    foregroundColor: '#e8eaed',
    mutedColor: '#8b919c',
    axisColor: '#343a43',
  }),
  // saturated hues ordered so that no adjacent pair collapses under colour-vision
  // deficiency (worst adjacent pair ΔE 9.1 in OKLab against protan/deutan/tritan)
  vibrant: theme({
    fills: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
    backgroundColor: '#ffffff',
    foregroundColor: '#16202b',
    mutedColor: '#5c6672',
    axisColor: '#dfe3e8',
    sequential: ['#cde2fb', '#184f95'],
  }),
  // low-chroma variant; true pastels fall below the chroma floor and stop
  // carrying identity, so these stay saturated enough to read as series colours
  muted: theme({
    fills: ['#3f7fbe', '#c1663a', '#2f8f68', '#a8578f', '#a17f1e', '#7a6bbf'],
    backgroundColor: '#fbfaf8',
    foregroundColor: '#2b2b2b',
    mutedColor: '#6f6f6f',
    axisColor: '#e2ded8',
    sequential: ['#e6edf8', '#4a6fa5'],
    axis: { gridDash: [2, 4] },
  }),
  // one hue, light to dark: an ordinal ramp for stages and tiers, not for six
  // unrelated categories
  mono: theme({
    fills: ['#86b6ef', '#5f9ae9', '#3a7fd8', '#2263ae', '#164a84', '#0d3159'],
    backgroundColor: '#ffffff',
    foregroundColor: '#16202b',
    mutedColor: '#6a7480',
    axisColor: '#dde2e8',
    sequential: ['#cde2fb', '#0d3159'],
    positiveColor: '#2263ae',
    negativeColor: '#8a3b3b',
    axis: { gridDash: [3, 3] },
  }),
  // every series colour clears 3:1 against the background, the chrome is inked
  // up and the axis shows its ticks and a solid grid
  contrast: theme({
    fills: ['#2a78d6', '#c0410a', '#0e7d55', '#c4547f', '#8a5f00', '#5b3fb8'],
    backgroundColor: '#ffffff',
    foregroundColor: '#000000',
    mutedColor: '#3a3a3a',
    axisColor: '#767676',
    sequential: ['#d3e2f7', '#0d366b'],
    positiveColor: '#00693e',
    negativeColor: '#a4123f',
    fontSize: 12,
    strokeWidth: 3,
    axis: { tick: true, strokeWidth: 1.5, gridDash: [] },
  }),
  // dark with a navy cast; the palette is stepped for the darker surface
  midnight: theme({
    fills: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
    backgroundColor: '#0e1626',
    foregroundColor: '#dbe3f0',
    mutedColor: '#8494ad',
    axisColor: '#24304a',
    sequential: ['#16305c', '#7fb3ff'],
    positiveColor: '#2fb37f',
    negativeColor: '#ef6a6a',
    axis: { gridDash: [2, 5] },
  }),
};
