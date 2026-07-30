/**
 * Module system contracts (kernel). Interfaces only — not a single
 * series/axis/feature implementation. Concrete modules are registered
 * in app/setup; layers talk through these contracts, never directly.
 */
import type { AxisPosition, CartesianAxisInstance, CartesianSeriesInstance, ChartWidget, SeriesColors } from './cartesian';
import type { PolarSeriesInstance } from './polar';
import type { StandaloneSeriesInstance } from './standalone';
import type { ColorValue } from '@/shared/options';
import type { Scene } from '@/shared/scene';

export * from './cartesian';
export * from './polar';
export * from './standalone';

export type ChartKind = 'cartesian' | 'polar' | 'hierarchy' | 'flow';

/** The theme as modules see it. */
export interface ThemeContext {
  backgroundColor: ColorValue;
  foregroundColor: ColorValue;
  mutedColor: ColorValue;
  /** Axis chrome: the axis line, ticks and grid lines. */
  axisColor: ColorValue;
  fontFamily: string;
  palette: { fills: ColorValue[]; strokes: ColorValue[] };
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
  ): ChartWidget & { setOptions(inputs: never, theme: never): void };
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
