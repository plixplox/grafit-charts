import { createChart, type ChartInstance } from './chart-instance';
import type { ChartOptions } from './options';
import { buildFinancialChartOptions, type FinancialChartOptions } from '@/widgets/presets/financial';
import { buildGaugeOptions, type GaugeOptions } from '@/widgets/presets/gauge';
import { buildSparklineOptions, type SparklineOptions } from '@/widgets/presets/sparkline';

export interface ChartsApi {
  create(options: ChartOptions): ChartInstance;
  /** Financial preset: candlestick/ohlc + ordinal-time + zoom + navigator + crosshair. */
  createFinancialChart(options: FinancialChartOptions): ChartInstance;
  /** Gauge (radial/linear): value + scale + needle/target. */
  createGauge(options: GaugeOptions): ChartInstance;
  /** Sparkline: a miniature line/area/bar with no chrome. */
  createSparkline(options: SparklineOptions): ChartInstance;
}

/**
 * Builds the public API. `prepare` is called before a chart is created —
 * the full grafit entry point passes registerDefaultModules here so that
 * registration is lazy (no side effects at the module's top level).
 */
export function buildCharts(prepare?: () => void): ChartsApi {
  const build = (options: ChartOptions): ChartInstance => {
    prepare?.();
    return createChart(options);
  };
  return {
    create: build,
    createFinancialChart: (options) => build(buildFinancialChartOptions(options) as ChartOptions),
    createGauge: (options) => build(buildGaugeOptions(options) as ChartOptions),
    createSparkline: (options) => build(buildSparklineOptions(options) as ChartOptions),
  };
}

export { buildSparklineOptions };
export type { FinancialChartOptions, GaugeOptions, SparklineOptions };

export type { ChartInstance } from './chart-instance';
export type {
  ChartOptions,
  SeriesOptions,
  AxisOptions,
  CaptionOptions,
  BackgroundOptions,
  LegendOptions,
  LegendItemOptions,
  LegendItemStyleOptions,
  LegendItemMarkerOptions,
  LegendMarkerOptions,
  LegendMarkerShape,
  LegendPlacement,
  LegendBackgroundOptions,
  GradientLegendOptions,
  TooltipOptions,
  HighlightOptions,
  OverlaysOptions,
  ZoomOptions,
  NavigatorOptions,
  CrosshairOptions,
  SyncOptions,
  ContextMenuOptions,
  AnimationOptions,
  FontsOptions,
  ChartState,
  LineSeriesOptions,
  BarSeriesOptions,
  AreaSeriesOptions,
  ScatterSeriesOptions,
  BubbleSeriesOptions,
  HistogramSeriesOptions,
  HistogramTooltipRendererParams,
  BinningOptions,
  BinEdge,
  BinRule,
  BinInclusive,
  BinOutliers,
  HistogramNormalize,
  HistogramNormalizeWithin,
  HistogramGroupMode,
  PieSeriesOptions,
  DonutSeriesOptions,
  RadarLineSeriesOptions,
  RadarAreaSeriesOptions,
  NightingaleSeriesOptions,
  RadialColumnSeriesOptions,
  RadialBarSeriesOptions,
  HeatmapSeriesOptions,
  RangeBarSeriesOptions,
  RangeAreaSeriesOptions,
  BoxPlotSeriesOptions,
  WaterfallSeriesOptions,
  FunnelSeriesOptions,
  ConeFunnelSeriesOptions,
  CandlestickSeriesOptions,
  OhlcSeriesOptions,
  TreemapSeriesOptions,
  SunburstSeriesOptions,
  PyramidSeriesOptions,
  SankeySeriesOptions,
  ChordSeriesOptions,
  RadialGaugeSeriesOptions,
  LinearGaugeSeriesOptions,
  LocaleOptions,
  AnnotationOptions,
  SelectionOptions,
  ChartListeners,
  NodeClickEvent,
  SelectionChangeEvent,
  NumberAxisOptions,
  CategoryAxisOptions,
  TimeAxisOptions,
  LogAxisOptions,
  OrdinalTimeAxisOptions,
  GroupedCategoryAxisOptions,
} from './options';
