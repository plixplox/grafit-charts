import type { ThemeName, ThemeOptions } from '@/app/themes';
import type { CategoryAxisOptions } from '@/entities/axis/category';
import type { GroupLabelFormatterParams, GroupLabelOptions, GroupedCategoryAxisOptions } from '@/entities/axis/grouped-category';
import type { LogAxisOptions } from '@/entities/axis/log';
import type { NumberAxisOptions } from '@/entities/axis/number';
import type { OrdinalTimeAxisOptions } from '@/entities/axis/ordinal-time';
import type { TimeAxisOptions } from '@/entities/axis/time';
import type { BackgroundOptions } from '@/entities/background';
import type { CaptionOptions } from '@/entities/caption';
import type { GradientLegendOptions } from '@/entities/gradient-legend';
import type {
  LegendBackgroundOptions,
  LegendItemMarkerOptions,
  LegendItemOptions,
  LegendItemStyleOptions,
  LegendMarkerOptions,
  LegendMarkerShape,
  LegendOptions,
  LegendPlacement,
} from '@/entities/legend';
import type { AreaSeriesOptions } from '@/entities/series/area';
import type { BarSeriesOptions } from '@/entities/series/bar';
import type { BoxPlotSeriesOptions } from '@/entities/series/box-plot';
import type { BubbleSeriesOptions } from '@/entities/series/bubble';
import type { CandlestickSeriesOptions } from '@/entities/series/candlestick';
import type { ChordSeriesOptions } from '@/entities/series/chord';
import type { ConeFunnelSeriesOptions } from '@/entities/series/cone-funnel';
import type { DonutSeriesOptions } from '@/entities/series/donut';
import type { FunnelSeriesOptions } from '@/entities/series/funnel';
import type { HeatmapSeriesOptions } from '@/entities/series/heatmap';
import type {
  BinEdge,
  BinInclusive,
  BinOutliers,
  BinRule,
  BinningOptions,
  HistogramGroupMode,
  HistogramNormalize,
  HistogramNormalizeWithin,
  HistogramSeriesOptions,
  HistogramTooltipRendererParams,
} from '@/entities/series/histogram';
import type { LineSeriesOptions } from '@/entities/series/line';
import type { LinearGaugeSeriesOptions } from '@/entities/series/linear-gauge';
import type { NightingaleSeriesOptions } from '@/entities/series/nightingale';
import type { OhlcSeriesOptions } from '@/entities/series/ohlc';
import type { PieSeriesOptions } from '@/entities/series/pie';
import type { PyramidSeriesOptions } from '@/entities/series/pyramid';
import type { RadarAreaSeriesOptions } from '@/entities/series/radar-area';
import type { RadarLineSeriesOptions } from '@/entities/series/radar-line';
import type { RadialBarSeriesOptions } from '@/entities/series/radial-bar';
import type { RadialColumnSeriesOptions } from '@/entities/series/radial-column';
import type { RadialGaugeSeriesOptions } from '@/entities/series/radial-gauge';
import type { RangeAreaSeriesOptions } from '@/entities/series/range-area';
import type { RangeBarSeriesOptions } from '@/entities/series/range-bar';
import type { SankeySeriesOptions } from '@/entities/series/sankey';
import type { ScatterSeriesOptions } from '@/entities/series/scatter';
import type { SunburstSeriesOptions } from '@/entities/series/sunburst';
import type { TreemapSeriesOptions } from '@/entities/series/treemap';
import type { WaterfallSeriesOptions } from '@/entities/series/waterfall';
import type { AnnotationOptions } from '@/features/annotations';
import type { ChartState } from '@/features/chart-state';
import type { ContextMenuOptions } from '@/features/context-menu';
import type { CrosshairOptions } from '@/features/crosshair';
import type { HighlightOptions } from '@/features/highlight';
import type { LocaleOptions } from '@/features/locale';
import type { NavigatorOptions } from '@/features/navigator';
import type { ChartListeners, NodeClickEvent, SelectionChangeEvent, SelectionOptions } from '@/features/selection';
import type { SyncOptions } from '@/features/sync';
import type { TooltipOptions } from '@/features/tooltip';
import type { ZoomOptions } from '@/features/zoom';
import type { AnimationOptions } from '@/shared/animation';
import type { Datum, PaddingValue } from '@/shared/options';
import type { FontsOptions } from '@/shared/scene';
import type { OverlaysOptions } from '@/widgets/cartesian-chart';
import type { PolarAxesOptions } from '@/widgets/polar-chart';

/** Discriminated union of series — extended phase by phase along the roadmap. */
export type SeriesOptions =
  | LineSeriesOptions
  | BarSeriesOptions
  | AreaSeriesOptions
  | ScatterSeriesOptions
  | BubbleSeriesOptions
  | HistogramSeriesOptions
  | PieSeriesOptions
  | DonutSeriesOptions
  | RadarLineSeriesOptions
  | RadarAreaSeriesOptions
  | NightingaleSeriesOptions
  | RadialColumnSeriesOptions
  | RadialBarSeriesOptions
  | HeatmapSeriesOptions
  | RangeBarSeriesOptions
  | RangeAreaSeriesOptions
  | BoxPlotSeriesOptions
  | WaterfallSeriesOptions
  | FunnelSeriesOptions
  | ConeFunnelSeriesOptions
  | CandlestickSeriesOptions
  | OhlcSeriesOptions
  | TreemapSeriesOptions
  | SunburstSeriesOptions
  | PyramidSeriesOptions
  | SankeySeriesOptions
  | ChordSeriesOptions
  | RadialGaugeSeriesOptions
  | LinearGaugeSeriesOptions;

/** Discriminated union of axes. */
export type AxisOptions =
  | NumberAxisOptions
  | CategoryAxisOptions
  | TimeAxisOptions
  | LogAxisOptions
  | OrdinalTimeAxisOptions
  | GroupedCategoryAxisOptions;

export interface ChartOptions {
  container?: HTMLElement;
  data?: Datum[];
  series?: SeriesOptions[];
  /**
   * Axes of the chart: a list for a cartesian one, a pair — the categories
   * around the rim and the values along the radius — for a polar one.
   */
  axes?: AxisOptions[] | PolarAxesOptions;
  title?: CaptionOptions;
  subtitle?: CaptionOptions;
  padding?: PaddingValue;
  background?: BackgroundOptions;
  legend?: LegendOptions;
  /** Color scale for colorField series (heatmap). */
  gradientLegend?: GradientLegendOptions;
  tooltip?: TooltipOptions;
  highlight?: HighlightOptions;
  /** Shows the "Loading…" overlay. */
  loading?: boolean;
  overlays?: OverlaysOptions;
  zoom?: ZoomOptions;
  navigator?: NavigatorOptions;
  crosshair?: CrosshairOptions;
  sync?: SyncOptions;
  contextMenu?: ContextMenuOptions;
  annotations?: AnnotationOptions[];
  /** Datum selection via rubber band/clicks + listeners.selectionChange. */
  selection?: SelectionOptions;
  listeners?: ChartListeners;
  animation?: AnimationOptions;
  locale?: LocaleOptions;
  initialState?: ChartState;
  theme?: ThemeName | ThemeOptions;
  /** Handling of web fonts that are still loading when the chart draws. */
  fonts?: FontsOptions;
  /** Without width/height the chart follows its container (ResizeObserver). */
  width?: number;
  height?: number;
}

export type {
  PolarAxesOptions,
  PolarAngleAxisOptions,
  PolarRadiusAxisOptions,
  PolarAxisLabelOptions,
  PolarAxisLabelParams,
  PolarAxisLineOptions,
  PolarAxisTitleOptions,
  PolarGridLineOptions,
} from '@/widgets/polar-chart';

export type {
  BackgroundOptions,
  CaptionOptions,
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
  // the binning vocabulary: needed to call binEdges() and to type an options object
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
  GroupLabelOptions,
  GroupLabelFormatterParams,
};
