/**
 * Module system contracts (kernel). Interfaces only — not a single
 * series/axis/feature implementation. Concrete modules are registered
 * in app/setup; layers talk through these contracts, never directly.
 */
import type { AxisPosition, CartesianAxisInstance, CartesianSeriesInstance, ChartWidget, SeriesColors } from './cartesian';
import type { PolarSeriesInstance } from './polar';
import type { StandaloneSeriesInstance } from './standalone';
import type { ColorValue, Fraction, Pixels } from '@/shared/options';
import type { Scene } from '@/shared/scene';

export * from './cartesian';
export * from './polar';
export * from './standalone';

export type ChartKind = 'cartesian' | 'polar' | 'hierarchy' | 'flow';

/**
 * Axis chrome as modules see it. The switches and the shared metrics are always
 * resolved; the rest is optional and falls back at the point of use — to
 * `axisColor` for the strokes, `mutedColor` for the labels, `foregroundColor`
 * for the title. That keeps `params.axisColor` in charge unless a theme
 * deliberately splits the three apart.
 */
export interface ThemeAxisContext {
  line: boolean;
  tick: boolean;
  gridLine: boolean;
  strokeWidth: Pixels;
  /** Grid dash pattern; an empty array draws a solid line. */
  gridDash: Pixels[];
  /** The axis line, separately from the grid and the ticks. */
  color?: ColorValue;
  /** Dash pattern of the axis line itself; solid by default. */
  lineDash?: Pixels[];
  gridColor?: ColorValue;
  tickColor?: ColorValue;
  /** Length of a tick mark, px. */
  tickSize?: Pixels;
  labelColor?: ColorValue;
  labelSize?: Pixels;
  /** Gap between the axis line and its labels, px. */
  labelSpacing?: Pixels;
  titleColor?: ColorValue;
  titleSize?: Pixels;
}

/**
 * The theme with every token resolved — the single definition, re-exported by
 * app/themes as ResolvedTheme. It lives here because shared cannot import app,
 * while app may import shared.
 */
export interface ThemeContext {
  backgroundColor: ColorValue;
  foregroundColor: ColorValue;
  mutedColor: ColorValue;
  /** Axis chrome: the axis line, ticks and grid lines. */
  axisColor: ColorValue;
  fontFamily: string;
  /** Base label size; component sizes are this plus a fixed FONT_STEP offset. */
  fontSize: Pixels;
  /** Data line width — line/area/radar strokes, never a shape outline. */
  strokeWidth: Pixels;
  /**
   * Nudge tokens: undefined leaves every mark with its own default, a value
   * overrides them all at once. The per-mark defaults differ on purpose
   * (a bar is square, a range bar is rounded), so there is no single literal
   * these could default to.
   */
  cornerRadius?: Pixels;
  fillOpacity?: Fraction;
  /** Outline width of filled marks — bars, sectors, boxes. Not a data line. */
  markStrokeWidth?: Pixels;
  /** Dash pattern of data lines; solid unless a theme or a series says otherwise. */
  lineDash?: Pixels[];
  /** Growth and decline: candlesticks, OHLC bars, falling waterfall columns. */
  positiveColor: ColorValue;
  negativeColor: ColorValue;
  palette: {
    fills: ColorValue[];
    strokes: ColorValue[];
    /** Continuous ramp for colorField series (heatmap) and gradient legends. */
    sequential: ColorValue[];
  };
  /** The one block theme overrides cannot express: ChartOptions.axes is an array. */
  axis: ThemeAxisContext;
}

/**
 * Component label sizes as offsets from ThemeContext.fontSize. Every hardcoded
 * size in the library sits within −1..+6 of the base, so the offsets reproduce
 * the built-in design exactly and scale together when the base moves.
 */
export const FONT_STEP = {
  /** 10 — polar ring labels, gradient legend. */
  small: -1,
  /** 11 — axis labels, series labels, callouts. */
  label: 0,
  /** 12 — axis title, legend, tooltip. */
  heading: 1,
  /** 13 — subtitle, empty-state overlay. */
  subtitle: 2,
  /** 14 — donut center label. */
  emphasis: 3,
  /** 17 — chart title. */
  title: 6,
} as const;

/** Resolved size of a label role. */
export function themeFont(theme: ThemeContext, step: number): Pixels {
  return Math.max(1, theme.fontSize + step);
}

export interface SeriesEnv {
  id: string;
  colors: SeriesColors;
  theme: ThemeContext;
}

export interface AxisEnv {
  position: AxisPosition;
  theme: ThemeContext;
}

/** Series instance of any family; the widget narrows it by the module's chartKind. */
export type AnySeriesInstance = CartesianSeriesInstance | PolarSeriesInstance | StandaloneSeriesInstance;

export interface SeriesModule<O = unknown> {
  kind: 'series';
  /** Options discriminator: 'line', 'bar', 'pie', ... */
  type: string;
  chartKind: ChartKind;
  /** Required options keys (validated when the chart is created). */
  requiredOptions?: string[];
  create(options: O, env: SeriesEnv): AnySeriesInstance;
}

export interface AxisModule<O = unknown> {
  kind: 'axis';
  /** 'number', 'category', 'time', ... */
  type: string;
  create(options: O, env: AxisEnv): CartesianAxisInstance;
}

/** Chart widget (cartesian/polar/standalone) as a registrable module. */
export interface ChartWidgetModule {
  kind: 'chart';
  /** Which series chartKinds the widget serves. */
  chartKinds: readonly ChartKind[];
  create(
    scene: Scene,
    registry: ModuleRegistry,
    requestRender: () => void,
    container?: HTMLElement,
  ): ChartWidget & { setOptions(inputs: never, theme: ThemeContext): void };
}

/**
 * Optional feature (tooltip, legend, navigator, ...). Widgets obtain
 * the implementation via registry.getFeature(name) and silently skip
 * rendering if the feature is not registered; api types are imported type-only.
 */
export interface FeatureModule<Api = unknown> {
  kind: 'feature';
  name: string;
  api: Api;
}

export type ChartModule = SeriesModule | AxisModule | ChartWidgetModule | FeatureModule;

export class ModuleRegistry {
  private readonly series = new Map<string, SeriesModule>();
  private readonly axes = new Map<string, AxisModule>();
  private readonly charts = new Map<ChartKind, ChartWidgetModule>();
  private readonly features = new Map<string, FeatureModule>();

  register(...modules: ChartModule[]): void {
    for (const module of modules) {
      switch (module.kind) {
        case 'series':
          this.series.set(module.type, module);
          break;
        case 'axis':
          this.axes.set(module.type, module);
          break;
        case 'chart':
          for (const chartKind of module.chartKinds) this.charts.set(chartKind, module);
          break;
        case 'feature':
          this.features.set(module.name, module);
          break;
      }
    }
  }

  getSeries(type: string): SeriesModule | undefined {
    return this.series.get(type);
  }

  getAxis(type: string): AxisModule | undefined {
    return this.axes.get(type);
  }

  getChart(chartKind: ChartKind): ChartWidgetModule | undefined {
    return this.charts.get(chartKind);
  }

  /** Feature API by name; the caller supplies the type (type-only import from the feature). */
  getFeature<Api>(name: string): Api | undefined {
    return this.features.get(name)?.api as Api | undefined;
  }
}

const warnedFeatures = new Set<string>();

/** One-time warning: the options request a feature missing from the registry. */
export function warnMissingFeature(name: string): void {
  if (warnedFeatures.has(name)) return;
  warnedFeatures.add(name);
  const moduleName = `${name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}Module`;
  console.warn(
    `grafit: feature "${name}" is not registered — the corresponding options are ignored. ` +
      `Import ${moduleName} from 'grafit-charts/modules' and pass it to register() from 'grafit-charts/core'.`,
  );
}

export type EventHandler = (event: unknown) => void;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  on(type: string, handler: EventHandler): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  emit(type: string, event: unknown): void {
    this.handlers.get(type)?.forEach((handler) => handler(event));
  }
}
