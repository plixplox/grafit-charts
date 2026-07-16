/**
 * grafit/core entry point: the engine without a single series/axis module.
 * Modules are wired up explicitly: import from 'grafit-charts/modules' + register().
 * Tree-shaking drops everything that is not registered.
 */
import { buildCharts } from '@/app/chart-factory';

export const Charts = buildCharts();

export { register } from '@/app/registry';
export type { ChartModule, SeriesModule, AxisModule, TooltipContentData, TooltipHeading, TooltipRow } from '@/shared/kernel';

export type {
  ChartInstance,
  ChartOptions,
  SeriesOptions,
  AxisOptions,
  CaptionOptions,
  BackgroundOptions,
  LegendOptions,
  LegendItemOptions,
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
  ChartState,
  LineSeriesOptions,
  BarSeriesOptions,
  AreaSeriesOptions,
  ScatterSeriesOptions,
  BubbleSeriesOptions,
  HistogramSeriesOptions,
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
  NumberAxisOptions,
  CategoryAxisOptions,
  TimeAxisOptions,
  LogAxisOptions,
  OrdinalTimeAxisOptions,
  GroupedCategoryAxisOptions,
} from '@/app/chart-factory';
export { buildSparklineOptions } from '@/app/chart-factory';
export type { FinancialChartOptions, GaugeOptions, SparklineOptions } from '@/app/chart-factory';
export type { ThemeName, ThemeOptions } from '@/app/themes';
export type * from '@/shared/options/primitives';
