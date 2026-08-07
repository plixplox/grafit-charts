import { renderBackground, type BackgroundOptions } from '@/entities/background';
import { hasCaptions, renderCaptions, type CaptionOptions } from '@/entities/caption';
import type { GradientLegendApi, GradientLegendOptions } from '@/entities/gradient-legend';
import type { Legend, LegendApi, LegendOptions } from '@/entities/legend';
import type { AnnotationOptions, AnnotationsApi } from '@/features/annotations';
import type { ChartState } from '@/features/chart-state';
import type { CrosshairApi, CrosshairOptions } from '@/features/crosshair';
import type { HighlightOptions } from '@/features/highlight';
import { localize, type LocaleOptions } from '@/features/locale';
import type { Navigator, NavigatorApi, NavigatorOptions } from '@/features/navigator';
import type { ChartListeners, SelectedItem, SelectionOptions } from '@/features/selection';
import type { SyncApi, SyncMember, SyncOptions } from '@/features/sync';
import type { HtmlTooltip, TooltipApi, TooltipOptions } from '@/features/tooltip';
import {
  FULL_WINDOW,
  isZoomed,
  panWindow,
  sliceDomain,
  windowExtent,
  zoomAround,
  type ZoomOptions,
  type ZoomWindow,
} from '@/features/zoom';
import { Animator, type AnimationOptions } from '@/shared/animation';
import { computeStacks, numericValues, type StackSeriesDef } from '@/shared/data';
import { DEFAULT_DIM_OPACITY, FONT_STEP, themeFont, warnMissingFeature, type ChartWidgetModule } from '@/shared/kernel';
import type {
  AxisPosition,
  CartesianAxisInstance,
  ColorScaleInfo,
  CartesianSeriesInstance,
  HighlightState,
  Insets,
  LayoutRect,
  MeasureText,
  ModuleRegistry,
  SeriesPick,
  StackSegment,
  ThemeContext,
  TooltipContentData,
} from '@/shared/kernel';
import { deepMerge, resolvePadding, type Datum, type PaddingValue, type Switchable } from '@/shared/options';
import { BandScale, LinearScale, TimeScale } from '@/shared/scale';
import { Group, Rect, Text, type Scene } from '@/shared/scene';
import { maxOverflow, NO_OVERFLOW } from '@/shared/util';

/**
 * Input contract of the widget. The public typed ChartOptions
 * (discriminated unions) is assembled in app/chart-factory and is
 * structurally compatible with this contract; concrete series/axis types
 * are resolved via the registry.
 */
export interface CartesianChartInputs {
  data?: Datum[];
  series?: Array<{ type: string }>;
  axes?: Array<{ type: string; position?: AxisPosition }>;
  title?: CaptionOptions;
  subtitle?: CaptionOptions;
  padding?: PaddingValue;
  background?: BackgroundOptions;
  legend?: LegendOptions;
  gradientLegend?: GradientLegendOptions;
  tooltip?: TooltipOptions;
  highlight?: HighlightOptions;
  loading?: boolean;
  overlays?: OverlaysOptions;
  zoom?: ZoomOptions;
  navigator?: NavigatorOptions;
  crosshair?: CrosshairOptions;
  annotations?: AnnotationOptions[];
  selection?: SelectionOptions;
  listeners?: ChartListeners;
  locale?: LocaleOptions;
  sync?: SyncOptions;
  animation?: AnimationOptions;
  initialState?: ChartState;
}

export interface OverlaysOptions {
  loading?: Switchable & { text?: string };
  noData?: Switchable & { text?: string };
}

const DEFAULT_PADDING = { top: 12, right: 20, bottom: 12, left: 20 };
const LEGEND_GAP = 12;
const NAVIGATOR_GAP = 10;
const DEFAULT_PICK_RANGE = 30;
const DEFAULT_ANIMATION_MS = 600;
/** Axis zones, labels and the plot rect settle on each other in this many passes. */
const LAYOUT_PASSES = 3;
const SIDES = ['top', 'right', 'bottom', 'left'] as const;

type DragMode = 'pan' | 'select' | 'data-select' | 'annotation' | 'nav-window' | 'nav-handle-start' | 'nav-handle-end';

export class CartesianChart implements SyncMember {
  private inputs: CartesianChartInputs = {};
  private theme!: ThemeContext;
  private series: CartesianSeriesInstance[] = [];
  private axes: CartesianAxisInstance[] = [];
  private legend: Legend | undefined;
  private navigator: Navigator | undefined;
  private readonly hiddenSeries = new Set<string>();
  private highlight: HighlightState | undefined;
  private plot: LayoutRect = { x: 0, y: 0, width: 0, height: 0 };
  private readonly tooltip: HtmlTooltip | undefined;

  private zoomX: ZoomWindow = FULL_WINDOW;
  private zoomY: ZoomWindow = FULL_WINDOW;
  private pointer: { x: number; y: number } | undefined;
  private dragMode: DragMode | undefined;
  private selectRect: { x0: number; y0: number; x1: number; y1: number } | undefined;
  private draggedAnnotation: number | undefined;
  /** Data Selection: seriesId → selected indices. */
  private readonly selectedMap = new Map<string, Set<number>>();
  private readonly animator = new Animator();
  private hasAnimated = false;
  /** Dimming animation: 0 — no fading, 1 — fully dimmed. */
  private readonly hoverAnimator = new Animator();
  private hoverT = 0;
  private fadeHighlight: HighlightState | undefined;
  private leaveSync: (() => void) | undefined;
  private suppressSyncBroadcast = false;

  constructor(
    private readonly scene: Scene,
    private readonly registry: ModuleRegistry,
    private readonly requestRender: () => void,
    container?: HTMLElement,
  ) {
    this.tooltip =
      container && typeof document !== 'undefined' ? this.registry.getFeature<TooltipApi>('tooltip')?.create(container) : undefined;
  }

  /** Optional feature from the registry; warn if the options request it but it is absent. */
  private feature<Api>(name: string, requested: boolean): Api | undefined {
    const api = this.registry.getFeature<Api>(name);
    if (!api && requested) warnMissingFeature(name);
    return api;
  }

  setOptions(inputs: CartesianChartInputs, theme: ThemeContext): void {
    this.inputs = inputs;
    this.theme = theme;
    this.highlight = undefined;
    this.buildSeries();
    this.buildAxes();
    if (inputs.tooltip && inputs.tooltip.enabled !== false && !this.tooltip) warnMissingFeature('tooltip');
    this.legend = this.feature<LegendApi>('legend', inputs.legend !== undefined)?.create(inputs.legend, theme);
    this.navigator = this.feature<NavigatorApi>('navigator', inputs.navigator?.enabled === true)?.create(inputs.navigator);
    if (this.navigator?.enabled) {
      const initial = this.navigator.initialWindow;
      if (initial && !isZoomed(this.zoomX)) this.zoomX = initial;
    }
    if (inputs.initialState) this.setState(inputs.initialState);
    this.joinSync();
    this.maybeAnimateEntrance();
  }

  // ------------------------------------------------------------- state

  getState(): ChartState {
    const state: ChartState = { hiddenSeries: [...this.hiddenSeries] };
    if (isZoomed(this.zoomX) || isZoomed(this.zoomY)) {
      state.zoom = {};
      if (isZoomed(this.zoomX)) state.zoom.x = this.zoomX;
      if (isZoomed(this.zoomY)) state.zoom.y = this.zoomY;
    }
    return state;
  }

  setState(state: ChartState): void {
    if (state.zoom?.x) this.zoomX = state.zoom.x;
    if (state.zoom?.y) this.zoomY = state.zoom.y;
    if (state.hiddenSeries) {
      this.hiddenSeries.clear();
      for (const id of state.hiddenSeries) this.hiddenSeries.add(id);
      for (const series of this.series) {
        series.visible = !this.hiddenSeries.has(series.id);
      }
    }
  }

  isZoomed(): boolean {
    return isZoomed(this.zoomX) || isZoomed(this.zoomY);
  }

  resetZoom(): void {
    this.zoomX = FULL_WINDOW;
    this.zoomY = FULL_WINDOW;
    this.afterZoomChange();
  }

  // ------------------------------------------------------------- assembly

  private buildSeries(): void {
    const list = this.inputs.series ?? [];
    this.series = list.map((seriesOptions, index) => {
      const module = this.registry.getSeries(seriesOptions.type);
      if (!module) {
        throw new Error(`grafit: unknown series type "${seriesOptions.type}"`);
      }
      if (module.chartKind !== 'cartesian') {
        throw new Error(`grafit: series "${seriesOptions.type}" is not supported by the cartesian chart`);
      }
      const fills = this.theme.palette.fills;
      const strokes = this.theme.palette.strokes;
      const instance = module.create(seriesOptions, {
        id: `${seriesOptions.type}-${index}`,
        colors: {
          fill: fills[index % fills.length] ?? '#436ff4',
          stroke: strokes[index % strokes.length] ?? '#436ff4',
        },
        theme: this.theme,
      });
      if (this.hiddenSeries.has(instance.id)) instance.visible = false;
      // chartKind is checked above — this is a cartesian series
      return instance as CartesianSeriesInstance;
    });
  }

  private get swapped(): boolean {
    return (this.inputs.series ?? []).some((series) => (series as { direction?: string }).direction === 'horizontal');
  }

  private buildAxes(): void {
    const swapped = this.swapped;
    // the default X axis type is suggested by the series (scatter/histogram prefer number)
    const xType = this.series.find((series) => series.preferredXAxisType?.())?.preferredXAxisType?.() ?? 'category';
    const yType = this.series.find((series) => series.preferredYAxisType?.())?.preferredYAxisType?.() ?? 'number';
    const defs =
      this.inputs.axes ??
      (swapped
        ? [
            { type: xType, position: 'left' as const },
            { type: yType, position: 'bottom' as const },
          ]
        : [
            { type: xType, position: 'bottom' as const },
            { type: yType, position: 'left' as const },
          ]);
    // heatmap-like series: labels only, without a grid of their own
    const bareAxes = this.series.length > 0 && this.series.every((series) => series.prefersBareAxes?.() === true);
    this.axes = defs.map((rawOptions) => {
      const fallback: AxisPosition = rawOptions.type === 'number' && !swapped ? 'left' : 'bottom';
      const position = rawOptions.position ?? fallback;
      // the categories get the axis line, the values get the grid — and never both ways round
      const alongCategories = this.alongCategories(position, swapped);
      // the theme switches gate the directional rule: it can silence the chrome
      // everywhere, but never revive what the rule above turned off
      const defaults: Record<string, unknown> = {};
      if (bareAxes || alongCategories || !this.theme.axis.gridLine) defaults.gridLine = { enabled: false };
      if (bareAxes || !alongCategories || !this.theme.axis.line) defaults.line = { enabled: false };
      // defaults sit underneath the user's axis options
      const axisOptions = deepMerge(defaults, rawOptions as never) as typeof rawOptions;
      const module = this.registry.getAxis(axisOptions.type);
      if (!module) {
        throw new Error(
          `grafit: axis type "${axisOptions.type}" is not registered. ` +
            `Import the module from 'grafit-charts/modules' and pass it to register() from 'grafit-charts/core'.`,
        );
      }
      return module.create(axisOptions, { position, theme: this.theme });
    });
  }

  /** true — the axis runs along the categories (the X direction), not the values. */
  private alongCategories(position: AxisPosition, swapped: boolean): boolean {
    const horizontalAxis = position === 'bottom' || position === 'top';
    return horizontalAxis ? !swapped : swapped;
  }

  private maybeAnimateEntrance(): void {
    if (this.hasAnimated || this.inputs.animation?.enabled === false) {
      this.hasAnimated = true;
      return;
    }
    this.hasAnimated = true;
    this.animator.play(this.inputs.animation?.duration ?? DEFAULT_ANIMATION_MS, () => {
      this.layoutAndRender();
      this.requestRender();
    });
  }

  private joinSync(): void {
    this.leaveSync?.();
    this.leaveSync = undefined;
    const sync = this.inputs.sync;
    if (sync && sync.enabled !== false) {
      this.leaveSync = this.feature<SyncApi>('sync', true)?.joinSyncGroup(sync.groupId ?? 'default', this);
    }
  }

  onRemoteHighlight(highlight: HighlightState | undefined): void {
    if (this.inputs.sync?.nodeInteraction === false) return;
    // a neighboring chart's highlight is mapped by datum index onto the first visible series
    const local = highlight
      ? { seriesId: this.series.find((series) => series.visible)?.id ?? highlight.seriesId, datumIndex: highlight.datumIndex }
      : undefined;
    if (!sameHighlight(this.highlight, local)) {
      this.highlight = local;
      this.layoutAndRender();
      this.requestRender();
    }
  }

  onRemoteZoom(window: ZoomWindow): void {
    if (this.inputs.sync?.zoom === false) return;
    this.zoomX = window;
    this.suppressSyncBroadcast = true;
    this.afterZoomChange();
    this.suppressSyncBroadcast = false;
  }

  // ------------------------------------------------------------- layout

  /** Full pass: domains → layout → render into the scene. */
  layoutAndRender(): void {
    const { width, height } = this.scene;
    const backgroundLayer = this.scene.layer('background');
    const gridLayer = this.scene.layer('grid');
    const axisLayer = this.scene.layer('axis');
    this.scene.layer('series');
    // inside axis labels are drawn over the series, so they get a layer of their own
    const axisForegroundLayer = this.scene.layer('axis-foreground');
    const legendLayer = this.scene.layer('legend');
    const captionLayer = this.scene.layer('caption');
    this.scene.layer('overlay');
    for (const staticLayer of [backgroundLayer, gridLayer, axisLayer, axisForegroundLayer, legendLayer, captionLayer]) {
      staticLayer.clear();
    }

    renderBackground(backgroundLayer, this.inputs.background, this.theme, width, height);

    const padding = resolvePadding(this.inputs.padding, DEFAULT_PADDING);
    const measureText = (text: string, font: string) => this.scene.measureText(text, font);
    const legend = this.legend;
    if (legend?.enabled) legend.setItems(this.series.flatMap((series) => series.legendItems()));
    // a floating legend is anchored to the whole chart area (captions included) and reserves no space
    const floatRect: LayoutRect | undefined =
      legend?.enabled && legend.floating
        ? { x: padding.left, y: padding.top, width: width - padding.left - padding.right, height: height - padding.top - padding.bottom }
        : undefined;
    // captions wrap around the floating legend box, so it has to be measured first
    const obstacle =
      floatRect && hasCaptions(this.inputs.title, this.inputs.subtitle) ? legend?.captionObstacle(floatRect, measureText) : undefined;
    const captions = renderCaptions(captionLayer, this.inputs.title, this.inputs.subtitle, this.theme, width, height, padding, {
      measureText,
      obstacle,
    });

    const avail: LayoutRect = {
      x: padding.left,
      y: padding.top + captions.top,
      width: width - padding.left - padding.right,
      height: height - padding.top - captions.top - padding.bottom - captions.bottom,
    };

    let legendRect: LayoutRect | undefined;
    if (legend?.enabled) {
      const size = legend.measure(measureText, (floatRect ?? avail).width, (floatRect ?? avail).height);
      if (size.width > 0 && size.height > 0) {
        if (floatRect) {
          legendRect = floatRect;
        } else {
          switch (legend.position) {
            case 'bottom':
              legendRect = { x: avail.x, y: avail.y + avail.height - size.height, width: avail.width, height: size.height };
              avail.height -= size.height + LEGEND_GAP;
              break;
            case 'top':
              legendRect = { x: avail.x, y: avail.y, width: avail.width, height: size.height };
              avail.y += size.height + LEGEND_GAP;
              avail.height -= size.height + LEGEND_GAP;
              break;
            case 'right':
              legendRect = { x: avail.x + avail.width - size.width, y: avail.y, width: size.width, height: avail.height };
              avail.width -= size.width + LEGEND_GAP;
              break;
            case 'left':
              legendRect = { x: avail.x, y: avail.y, width: size.width, height: avail.height };
              avail.x += size.width + LEGEND_GAP;
              avail.width -= size.width + LEGEND_GAP;
              break;
          }
        }
      }
    }

    // the navigator occupies a strip below the plot area
    let navigatorRect: LayoutRect | undefined;
    const navigator = this.navigator;
    if (navigator?.enabled) {
      const navHeight = navigator.height;
      navigatorRect = { x: avail.x, y: avail.y + avail.height - navHeight, width: avail.width, height: navHeight };
      avail.height -= navHeight + NAVIGATOR_GAP;
    }

    // domains adjusted for the zoom window
    const data = this.inputs.data ?? [];
    const visibleSeries = this.series.filter((series) => series.visible);
    const categories = this.collectCategories(visibleSeries, data);
    const stacks = this.computeSeriesStacks(visibleSeries, data);
    const valueDomain = this.collectValueDomain(visibleSeries, data, stacks);
    const yCategories = this.collectYCategories(visibleSeries, data);
    const swapped = this.swapped;
    for (const axis of this.axes) {
      const horizontalAxis = axis.position === 'bottom' || axis.position === 'top';
      const isCategoryDirection = this.alongCategories(axis.position, swapped);
      const window = horizontalAxis ? this.zoomX : this.zoomY;
      if (isCategoryDirection) {
        axis.setDomain(sliceDomain(categories, window));
      } else if (axis.type === 'category') {
        // categorical value axis (heatmap)
        axis.setDomain(sliceDomain(yCategories, window));
      } else {
        axis.setDomain(windowExtent(valueDomain, window));
      }
    }

    // gradient legend (heatmap) occupies a strip on the right
    const gradientOptions = this.inputs.gradientLegend;
    let colorInfo =
      gradientOptions?.enabled === false
        ? undefined
        : visibleSeries.map((series) => series.colorScaleInfo?.()).find((info) => info !== undefined);
    const gradientApi = this.feature<GradientLegendApi>('gradient-legend', colorInfo !== undefined);
    if (!gradientApi) colorInfo = undefined;
    const gradientSpacing = gradientOptions?.spacing ?? 10;
    if (colorInfo && gradientApi) {
      if (gradientOptions?.position === 'bottom') {
        avail.height -= gradientApi.HEIGHT + gradientSpacing;
      } else {
        avail.width -= gradientApi.WIDTH + Math.max(0, gradientSpacing - 10);
      }
    }

    // axis-less series (funnel) get the whole area
    const barePlot = visibleSeries.length > 0 && visibleSeries.every((series) => series.hidesAxes?.() === true);

    const xAxis = this.axes.find((axis) => axis.position === 'bottom' || axis.position === 'top');
    const yAxis = this.axes.find((axis) => axis.position === 'left' || axis.position === 'right');
    const slots = this.assignBandSlots(visibleSeries);

    // iterative layout: axis thickness depends on labels, labels depend on range
    let plot: LayoutRect = { ...avail };
    for (let pass = 0; pass < LAYOUT_PASSES; pass++) {
      for (const axis of this.axes) axis.layout(plot);
      const inset = { top: 0, right: 0, bottom: 0, left: 0 };
      // an axis-less chart reserves no axis zones, but its labels still need room
      if (!barePlot) {
        for (const axis of this.axes) {
          inset[axis.position] = Math.max(inset[axis.position], axis.measure(measureText));
        }
      }
      // labels hanging over the plot edges want the same room as the axis zones do
      const overflow = this.labelOverflow(plot, measureText, { data, xAxis, yAxis, swapped, stacks, slots, barePlot });
      for (const side of SIDES) inset[side] = Math.max(inset[side], Math.ceil(overflow[side]));
      plot = {
        x: avail.x + inset.left,
        y: avail.y + inset.top,
        width: Math.max(0, avail.width - inset.left - inset.right),
        height: Math.max(0, avail.height - inset.top - inset.bottom),
      };
    }
    for (const axis of this.axes) axis.layout(plot);
    this.plot = plot;

    if (!barePlot) {
      for (const axis of this.axes) axis.render(axisLayer, gridLayer, plot, axisForegroundLayer);
    }

    if (legend && legendRect) legend.render(legendLayer, legendRect);

    this.renderCache = {
      data,
      visibleCount: visibleSeries.length,
      xAxis,
      yAxis,
      swapped,
      stacks,
      slots,
      navigatorRect,
      colorInfo,
    };
    this.scene.markDirty();
    this.renderDynamicLayers();
  }

  /**
   * Room the labels need outside the plot rect: tick labels hang over the ends
   * of their axis, value labels sit beside their marks. Both are measured
   * against the plot the current pass produced, so the layout converges on a
   * rect where every label still fits the chart area.
   */
  private labelOverflow(
    plot: LayoutRect,
    measureText: MeasureText,
    cache: {
      data: Datum[];
      xAxis: CartesianAxisInstance | undefined;
      yAxis: CartesianAxisInstance | undefined;
      swapped: boolean;
      stacks: Map<string, StackSegment>;
      slots: Map<string, { index: number; count: number }>;
      barePlot: boolean;
    },
  ): Insets {
    let overflow = NO_OVERFLOW;
    if (!cache.barePlot) {
      for (const axis of this.axes) {
        overflow = maxOverflow(overflow, axis.labelOverflow?.(measureText, plot) ?? NO_OVERFLOW);
      }
    }
    const { xAxis, yAxis } = cache;
    if (!xAxis || !yAxis) return overflow;
    for (const series of this.series) {
      if (!series.visible || !series.labelOverflow) continue;
      overflow = maxOverflow(
        overflow,
        series.labelOverflow({
          data: cache.data,
          xScale: xAxis.scale,
          yScale: yAxis.scale,
          swapped: cache.swapped,
          plot,
          stack: cache.stacks.get(series.id),
          group: cache.slots.get(series.id),
          measureText,
        }),
      );
    }
    return overflow;
  }

  private renderCache:
    | {
        data: Datum[];
        visibleCount: number;
        xAxis: CartesianAxisInstance | undefined;
        yAxis: CartesianAxisInstance | undefined;
        swapped: boolean;
        stacks: Map<string, StackSegment>;
        slots: Map<string, { index: number; count: number }>;
        navigatorRect: LayoutRect | undefined;
        colorInfo: ColorScaleInfo | undefined;
      }
    | undefined;

  /**
   * Fast hover/highlight path: only the series and overlay groups are
   * rebuilt from the last layout cache (no domain/axis recalculation).
   */
  private renderDynamicLayers(): void {
    const cache = this.renderCache;
    if (!cache) return;
    const seriesLayer = this.scene.layer('series');
    const overlayLayer = this.scene.layer('overlay');
    seriesLayer.clear();
    overlayLayer.clear();
    const { data, xAxis, yAxis, swapped, stacks, slots, navigatorRect, colorInfo } = cache;
    const plot = this.plot;

    if (xAxis && yAxis) {
      for (const series of this.series) {
        series.update({
          data,
          xScale: xAxis.scale,
          yScale: yAxis.scale,
          swapped,
          plot,
          layer: seriesLayer,
          highlight: this.inputs.highlight?.enabled !== false ? (this.highlight ?? this.fadeHighlight) : undefined,
          dimOpacity: this.effectiveDimOpacity(),
          selected: this.selectedMap.get(series.id),
          selectionActive: this.selectionActive(),
          selectionStyle: {
            ...this.inputs.selection?.itemStyle,
            inactiveOpacity: this.inputs.selection?.inactiveOpacity,
          },
          stack: stacks.get(series.id),
          group: slots.get(series.id),
          animationT: this.animator.t,
        });
      }
      if (this.inputs.annotations?.length) {
        this.feature<AnnotationsApi>('annotations', true)?.render(this.inputs.annotations, {
          layer: overlayLayer,
          plot,
          xScale: xAxis.scale,
          yScale: yAxis.scale,
          theme: this.theme,
        });
      }
    }

    const gradientApi = this.registry.getFeature<GradientLegendApi>('gradient-legend');
    if (colorInfo && gradientApi) {
      const gradientOptions = this.inputs.gradientLegend;
      const spacing = gradientOptions?.spacing ?? 10;
      const rect =
        gradientOptions?.position === 'bottom'
          ? { x: plot.x, y: plot.y + plot.height + spacing + 24, width: plot.width, height: gradientApi.HEIGHT - 12 }
          : { x: plot.x + plot.width + spacing, y: plot.y, width: gradientApi.WIDTH - 10, height: plot.height };
      gradientApi.render(overlayLayer, rect, colorInfo, this.theme, gradientOptions);
    }
    if (this.navigator?.enabled && navigatorRect) {
      this.navigator.render(overlayLayer, navigatorRect, this.zoomX, this.theme, this.miniChartValues(data));
    }
    this.renderCrosshairIfNeeded(overlayLayer, xAxis, yAxis);
    if (this.selectRect) {
      const selection = new Rect();
      selection.x = Math.min(this.selectRect.x0, this.selectRect.x1);
      selection.y = Math.min(this.selectRect.y0, this.selectRect.y1);
      selection.width = Math.abs(this.selectRect.x1 - this.selectRect.x0);
      selection.height = Math.abs(this.selectRect.y1 - this.selectRect.y0);
      selection.fill = this.theme.palette.fills[0] ?? '#436ff4';
      selection.opacity = 0.15;
      selection.stroke = this.theme.palette.fills[0] ?? '#436ff4';
      selection.strokeWidth = 1;
      overlayLayer.append(selection);
    }
    this.renderOverlays(overlayLayer, plot, data, cache.visibleCount);
    this.scene.markDirty('series', 'overlay');
  }

  /** Values of the first visible series for the navigator thumbnail. */
  private miniChartValues(data: Datum[]): number[] | undefined {
    const index = this.series.findIndex((series) => series.visible);
    if (index < 0) return undefined;
    const options = this.inputs.series?.[index] as { yField?: string } | undefined;
    if (!options?.yField) return undefined;
    return numericValues(data, options.yField);
  }

  private renderCrosshairIfNeeded(layer: Group, xAxis: CartesianAxisInstance | undefined, yAxis: CartesianAxisInstance | undefined): void {
    const options = this.inputs.crosshair;
    if (!options || options.enabled === false || !this.pointer) return;
    const { x, y } = this.pointer;
    const inPlot = x >= this.plot.x && x <= this.plot.x + this.plot.width && y >= this.plot.y && y <= this.plot.y + this.plot.height;
    if (!inPlot) return;

    const crosshairApi = this.feature<CrosshairApi>('crosshair', true);
    if (!crosshairApi) return;
    const snap = options.snap !== false;
    const pick = snap ? this.pickNearest(x, y) : undefined;
    const cx = pick?.x ?? x;
    const cy = pick?.y ?? y;
    crosshairApi.render(options, {
      layer,
      plot: this.plot,
      theme: this.theme,
      x: cx,
      y: cy,
      xLabel: xAxis ? this.axisLabelAt(xAxis, cx) : undefined,
      yLabel: yAxis ? this.axisLabelAt(yAxis, cy) : undefined,
    });
  }

  /** Human-readable axis value at a pixel position. */
  private axisLabelAt(axis: CartesianAxisInstance, pixel: number): string | undefined {
    const scale = axis.scale;
    if (scale instanceof BandScale) {
      let bestValue: unknown;
      let bestDistance = Infinity;
      for (const value of scale.domain) {
        const distance = Math.abs(scale.center(value) - pixel);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestValue = value;
        }
      }
      return bestValue === undefined ? undefined : String(bestValue);
    }
    if (scale instanceof TimeScale) {
      return scale.formatTick(scale.invert(pixel));
    }
    if (scale instanceof LinearScale) {
      const value = scale.invert(pixel);
      const span = Math.abs(scale.domain[1] - scale.domain[0]);
      const digits = span > 100 ? 0 : span > 1 ? 1 : 3;
      return value.toFixed(digits);
    }
    return undefined;
  }

  private renderOverlays(layer: Group, plot: LayoutRect, data: Datum[], visibleCount: number): void {
    const overlays = this.inputs.overlays;
    let message: string | undefined;
    if (this.inputs.loading && overlays?.loading?.enabled !== false) {
      message = overlays?.loading?.text ?? localize(this.inputs.locale, 'loading');
    } else if ((data.length === 0 || visibleCount === 0) && overlays?.noData?.enabled !== false) {
      message = overlays?.noData?.text ?? localize(this.inputs.locale, 'noData');
    }
    if (!message) return;
    const text = new Text();
    text.text = message;
    text.x = plot.x + plot.width / 2;
    text.y = plot.y + plot.height / 2;
    text.textAlign = 'center';
    text.textBaseline = 'middle';
    text.fontSize = themeFont(this.theme, FONT_STEP.subtitle);
    text.fontFamily = this.theme.fontFamily;
    text.fill = this.theme.mutedColor;
    layer.append(text);
  }

  private collectYCategories(series: CartesianSeriesInstance[], data: Datum[]): unknown[] {
    const seen = new Set<unknown>();
    const categories: unknown[] = [];
    for (const instance of series) {
      for (const value of instance.yValues?.(data) ?? []) {
        if (!seen.has(value)) {
          seen.add(value);
          categories.push(value);
        }
      }
    }
    return categories;
  }

  private collectCategories(series: CartesianSeriesInstance[], data: Datum[]): unknown[] {
    const seen = new Set<unknown>();
    const categories: unknown[] = [];
    for (const instance of series) {
      for (const value of instance.xValues(data)) {
        if (!seen.has(value)) {
          seen.add(value);
          categories.push(value);
        }
      }
    }
    return categories;
  }

  private computeSeriesStacks(series: CartesianSeriesInstance[], data: Datum[]): Map<string, StackSegment> {
    const defs: StackSeriesDef[] = [];
    for (const instance of series) {
      const participation = instance.stackParticipation();
      if (participation) {
        defs.push({
          id: instance.id,
          key: participation.key,
          stackGroup: participation.stackGroup,
          normalizedTo: participation.normalizedTo,
        });
      }
    }
    return computeStacks(data, defs);
  }

  private collectValueDomain(series: CartesianSeriesInstance[], data: Datum[], stacks: Map<string, StackSegment>): number[] {
    let min = Infinity;
    let max = -Infinity;
    for (const instance of series) {
      const domain = instance.yDomain(data, stacks.get(instance.id));
      if (!domain) continue;
      min = Math.min(min, domain[0]);
      max = Math.max(max, domain[1]);
    }
    return min <= max ? [min, max] : [0, 1];
  }

  /** Band slots: each stackGroup is one slot, each standalone bar series gets its own. */
  private assignBandSlots(series: CartesianSeriesInstance[]): Map<string, { index: number; count: number }> {
    const slotIndex = new Map<string, number>();
    const assignment = new Map<string, { index: number; count: number }>();
    for (const instance of series) {
      if (!instance.occupiesBandSlot()) continue;
      const participation = instance.stackParticipation();
      const key = participation ? `stack:${participation.stackGroup}` : `series:${instance.id}`;
      if (!slotIndex.has(key)) slotIndex.set(key, slotIndex.size);
      assignment.set(instance.id, { index: slotIndex.get(key) ?? 0, count: 0 });
    }
    for (const value of assignment.values()) value.count = Math.max(1, slotIndex.size);
    return assignment;
  }

  // ---------------------------------------------------------------- events

  handlePointerMove(x: number, y: number): void {
    this.pointer = { x, y };
    const inPlot = x >= this.plot.x && x <= this.plot.x + this.plot.width && y >= this.plot.y && y <= this.plot.y + this.plot.height;
    const pick = inPlot ? this.pickNearest(x, y) : undefined;
    const next: HighlightState | undefined = pick
      ? {
          seriesId: pick.seriesId,
          datumIndex: pick.datumIndex,
          allSeries: this.inputs.tooltip?.mode === 'shared' ? true : undefined,
        }
      : undefined;

    const highlightChanged = !sameHighlight(this.highlight, next);
    if (highlightChanged) {
      const previous = this.highlight;
      this.highlight = next;
      this.broadcastHighlightIfSynced();
      if (next && !previous) {
        this.animateHover(1);
      } else if (!next && previous) {
        this.fadeHighlight = previous;
        this.animateHover(0);
      }
    }
    const crosshairActive = this.inputs.crosshair && this.inputs.crosshair.enabled !== false;
    if (highlightChanged || crosshairActive) {
      this.renderDynamicLayers();
      this.requestRender();
    }

    if (pick && this.tooltip && this.inputs.tooltip?.enabled !== false) {
      const content =
        this.inputs.tooltip?.mode === 'shared'
          ? this.sharedTooltipContent(pick)
          : this.series.find((instance) => instance.id === pick.seriesId)?.tooltipFor(pick.datumIndex);
      if (content) this.tooltip.show(content, ...this.tooltipAnchor(pick, x, y), this.theme, this.inputs.tooltip);
    } else {
      this.tooltip?.hide();
    }
  }

  /** Shared mode: rows of all visible series for the category under the cursor. */
  private sharedTooltipContent(pick: SeriesPick) {
    const rows: TooltipContentData['rows'] = [];
    let heading: TooltipContentData['heading'];
    for (const series of this.series) {
      if (!series.visible) continue;
      const content = series.tooltipFor(pick.datumIndex, 'shared');
      heading ??= content.heading;
      rows.push(...content.rows);
    }
    return { heading, rows };
  }

  /** Tooltip anchor point respecting tooltip.position. */
  private tooltipAnchor(pick: SeriesPick, pointerX: number, pointerY: number): [number, number] {
    const position = this.inputs.tooltip?.position;
    const baseX = position?.anchorTo === 'pointer' ? pointerX : position?.anchorTo === 'center' ? (pick.centerX ?? pick.x) : pick.x;
    const baseY = position?.anchorTo === 'pointer' ? pointerY : position?.anchorTo === 'center' ? (pick.centerY ?? pick.y) : pick.y;
    return [baseX + (position?.xOffset ?? 0), baseY + (position?.yOffset ?? 0)];
  }

  handlePointerLeave(): void {
    this.tooltip?.hide();
    const hadCrosshair = this.pointer !== undefined && this.inputs.crosshair;
    this.pointer = undefined;
    if (this.highlight || hadCrosshair) {
      if (this.highlight) {
        this.fadeHighlight = this.highlight;
        this.highlight = undefined;
        this.broadcastHighlightIfSynced();
        this.animateHover(0);
      } else {
        this.renderDynamicLayers();
        this.requestRender();
      }
    }
  }

  /** Smooth transition of the dimming factor towards target (0|1). */
  private animateHover(target: number): void {
    const start = this.hoverT;
    if (start === target) {
      this.renderDynamicLayers();
      this.requestRender();
      return;
    }
    this.hoverAnimator.play(140, (k) => {
      this.hoverT = start + (target - start) * k;
      if (target === 0 && this.hoverT <= 0.02) this.fadeHighlight = undefined;
      this.renderDynamicLayers();
      this.requestRender();
    });
  }

  handleClick(x: number, y: number): void {
    // a floating legend overlays the plot — its items win over point picking
    if (this.legend?.enabled && this.legend.floating && this.legend.hitTest(x, y) !== undefined) {
      this.handleLegendClick(x, y);
      return;
    }
    const inPlot = x >= this.plot.x && x <= this.plot.x + this.plot.width && y >= this.plot.y && y <= this.plot.y + this.plot.height;
    if (inPlot) {
      const pick = this.pickNearest(x, y);
      if (pick && this.inputs.listeners?.nodeClick) {
        const datum = (this.inputs.data ?? [])[pick.datumIndex];
        if (datum) this.inputs.listeners.nodeClick({ seriesId: pick.seriesId, datumIndex: pick.datumIndex, datum });
      }
      if (this.inputs.selection?.enabled) {
        const multiple = this.inputs.selection.mode === 'multiple';
        if (pick) {
          const set = multiple ? (this.selectedMap.get(pick.seriesId) ?? new Set<number>()) : new Set<number>();
          if (!multiple) this.selectedMap.clear();
          if (multiple && set.has(pick.datumIndex)) {
            set.delete(pick.datumIndex);
          } else {
            set.add(pick.datumIndex);
          }
          this.selectedMap.set(pick.seriesId, set);
        } else {
          this.selectedMap.clear();
        }
        this.emitSelectionChange();
        this.renderDynamicLayers();
        this.requestRender();
        return;
      }
    }
    this.handleLegendClick(x, y);
  }

  private handleLegendClick(x: number, y: number): void {
    const legend = this.legend;
    if (!legend?.enabled || !legend.toggleSeries) return;
    const seriesId = legend.hitTest(x, y);
    if (!seriesId) return;
    const legendApi = this.registry.getFeature<LegendApi>('legend');
    if (legendApi && (seriesId === legendApi.PAGER_PREV || seriesId === legendApi.PAGER_NEXT)) {
      legend.nextPage(seriesId === legendApi.PAGER_NEXT ? 1 : -1);
      this.layoutAndRender();
      this.requestRender();
      return;
    }
    const series = this.series.find((instance) => instance.id === seriesId);
    if (!series) return;
    series.visible = !series.visible;
    this.inputs.listeners?.legendItemClick?.({ seriesId: series.id, visible: series.visible });
    if (series.visible) {
      this.hiddenSeries.delete(seriesId);
    } else {
      this.hiddenSeries.add(seriesId);
    }
    this.layoutAndRender();
    this.requestRender();
  }

  handleDoubleClick(): void {
    const zoom = this.inputs.zoom;
    if (zoom?.enabled && zoom.doubleClickReset === false) return;
    if (this.isZoomed()) this.resetZoom();
  }

  handleWheel(x: number, y: number, deltaY: number, preventDefault: () => void): void {
    const zoom = this.inputs.zoom;
    if (!zoom?.enabled || zoom.wheelZoom === false) return;
    const inPlot = x >= this.plot.x && x <= this.plot.x + this.plot.width && y >= this.plot.y && y <= this.plot.y + this.plot.height;
    if (!inPlot) return;
    preventDefault();
    this.applyWheelZoom(x, y, deltaY);
  }

  private applyWheelZoom(x: number, y: number, deltaY: number): void {
    const step = this.inputs.zoom?.wheelStep ?? 0.1;
    this.zoomByFactor(x, y, deltaY > 0 ? 1 + step : 1 / (1 + step));
  }

  private zoomByFactor(x: number, y: number, factor: number): void {
    const zoom = this.inputs.zoom;
    if (!zoom?.enabled) return;
    const minRatio = zoom.minRatio ?? 0.05;
    const axes = zoom.axes ?? 'x';
    if (axes === 'x' || axes === 'xy') {
      const pivot = (x - this.plot.x) / Math.max(1, this.plot.width);
      this.zoomX = zoomAround(this.zoomX, pivot, factor, minRatio);
    }
    if (axes === 'y' || axes === 'xy') {
      const pivot = 1 - (y - this.plot.y) / Math.max(1, this.plot.height);
      this.zoomY = zoomAround(this.zoomY, pivot, factor, minRatio);
    }
    this.afterZoomChange();
  }

  handleDragStart(x: number, y: number, modifiers?: { alt: boolean; ctrl: boolean; shift: boolean; meta: boolean }): void {
    this.dragMode = undefined;
    this.selectRect = undefined;
    const navigator = this.navigator;
    if (navigator?.enabled) {
      const hit = navigator.hitTest(x, y, this.zoomX);
      if (hit === 'handle-start') this.dragMode = 'nav-handle-start';
      else if (hit === 'handle-end') this.dragMode = 'nav-handle-end';
      else if (hit === 'window') this.dragMode = 'nav-window';
      if (this.dragMode) return;
    }
    // dragging of horizontal/vertical annotation lines
    const annotationIndex = this.hitAnnotation(x, y);
    if (annotationIndex !== undefined) {
      this.dragMode = 'annotation';
      this.draggedAnnotation = annotationIndex;
      return;
    }
    const zoom = this.inputs.zoom;
    const inPlot = x >= this.plot.x && x <= this.plot.x + this.plot.width && y >= this.plot.y && y <= this.plot.y + this.plot.height;
    // selection box — opt-in (boxSelect) and only in multiple mode
    if (this.inputs.selection?.enabled && this.inputs.selection.boxSelect === true && this.inputs.selection.mode === 'multiple' && inPlot) {
      this.dragMode = 'data-select';
      this.selectRect = { x0: x, y0: y, x1: x, y1: y };
      return;
    }
    if (!zoom?.enabled || !inPlot) return;
    const panKeyHeld = zoom.panKey ? (modifiers?.[zoom.panKey] ?? false) : undefined;
    if (zoom.dragSelect && panKeyHeld !== true) {
      this.dragMode = 'select';
      this.selectRect = { x0: x, y0: y, x1: x, y1: y };
      return;
    }
    if (zoom.dragPan !== false && (zoom.panKey ? panKeyHeld === true : this.isZoomed())) {
      this.dragMode = 'pan';
    }
  }

  handleDragMove(x: number, _y: number, dx: number, _dy: number): void {
    const navigator = this.navigator;
    const minRatio = this.inputs.zoom?.minRatio ?? 0.05;
    if ((this.dragMode === 'select' || this.dragMode === 'data-select') && this.selectRect) {
      this.selectRect.x1 = x;
      this.selectRect.y1 = _y;
      this.renderDynamicLayers();
      this.requestRender();
      return;
    }
    if (this.dragMode === 'annotation' && this.draggedAnnotation !== undefined) {
      this.moveAnnotation(this.draggedAnnotation, x, _y);
      return;
    }
    switch (this.dragMode) {
      case 'pan': {
        this.zoomX = panWindow(this.zoomX, -dx / Math.max(1, this.plot.width));
        this.afterZoomChange();
        break;
      }
      case 'nav-window': {
        if (!navigator) return;
        const span = this.zoomX[1] - this.zoomX[0];
        const deltaAbs = dx / Math.max(1, this.plot.width);
        const start = Math.max(0, Math.min(this.zoomX[0] + deltaAbs, 1 - span));
        this.zoomX = [start, start + span];
        this.afterZoomChange();
        break;
      }
      case 'nav-handle-start': {
        if (!navigator) return;
        const ratio = navigator.ratioAt(x);
        this.zoomX = [Math.min(ratio, this.zoomX[1] - minRatio), this.zoomX[1]];
        this.afterZoomChange();
        break;
      }
      case 'nav-handle-end': {
        if (!navigator) return;
        const ratio = navigator.ratioAt(x);
        this.zoomX = [this.zoomX[0], Math.max(ratio, this.zoomX[0] + minRatio)];
        this.afterZoomChange();
        break;
      }
      default:
        break;
    }
  }

  handleDragEnd(): void {
    if (this.dragMode === 'data-select' && this.selectRect) {
      const { x0, y0, x1, y1 } = this.selectRect;
      this.selectRect = undefined;
      this.dragMode = undefined;
      const multiple = this.inputs.selection?.mode === 'multiple';
      if (!multiple) this.selectedMap.clear();
      if (Math.abs(x1 - x0) > 4 || Math.abs(y1 - y0) > 4) {
        for (const series of this.series) {
          if (!series.visible || !series.pickInRect) continue;
          const indices = series.pickInRect(x0, y0, x1, y1);
          if (indices.length === 0) continue;
          const set = this.selectedMap.get(series.id) ?? new Set<number>();
          for (const index of indices) set.add(index);
          this.selectedMap.set(series.id, set);
        }
      }
      this.emitSelectionChange();
      this.renderDynamicLayers();
      this.requestRender();
      return;
    }
    if (this.dragMode === 'select' && this.selectRect) {
      const { x0, x1, y0, y1 } = this.selectRect;
      this.selectRect = undefined;
      const zoom = this.inputs.zoom;
      const axes = zoom?.axes ?? 'x';
      const minRatio = zoom?.minRatio ?? 0.05;
      if (Math.abs(x1 - x0) > 8 && this.plot.width > 0) {
        if (axes === 'x' || axes === 'xy') {
          this.zoomX = windowFromSelection(this.zoomX, x0, x1, this.plot.x, this.plot.width, minRatio, false);
        }
        if ((axes === 'y' || axes === 'xy') && Math.abs(y1 - y0) > 8 && this.plot.height > 0) {
          this.zoomY = windowFromSelection(this.zoomY, y0, y1, this.plot.y, this.plot.height, minRatio, true);
        }
        this.dragMode = undefined;
        this.afterZoomChange();
        return;
      }
      this.renderDynamicLayers();
      this.requestRender();
    }
    this.dragMode = undefined;
  }

  /** Finds an annotation line under the cursor (5px) for dragging. */
  private hitAnnotation(x: number, y: number): number | undefined {
    const annotations = this.inputs.annotations;
    const cache = this.renderCache;
    if (!annotations?.length || !cache?.xAxis || !cache.yAxis) return undefined;
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i];
      if (annotation?.type === 'horizontal-line') {
        const py = (cache.yAxis.scale as LinearScale).convert(annotation.value);
        if (Math.abs(py - y) <= 5 && x >= this.plot.x && x <= this.plot.x + this.plot.width) return i;
      } else if (annotation?.type === 'vertical-line') {
        const scale = cache.xAxis.scale;
        const px = scale instanceof BandScale ? scale.center(annotation.value) : (scale as LinearScale).convert(Number(annotation.value));
        if (Math.abs(px - x) <= 5 && y >= this.plot.y && y <= this.plot.y + this.plot.height) return i;
      }
    }
    return undefined;
  }

  /** Moves an annotation line to the cursor coordinate. */
  private moveAnnotation(index: number, x: number, y: number): void {
    const annotation = this.inputs.annotations?.[index];
    const cache = this.renderCache;
    if (!annotation || !cache?.xAxis || !cache.yAxis) return;
    if (annotation.type === 'horizontal-line') {
      const scale = cache.yAxis.scale;
      if (scale instanceof LinearScale) {
        const span = Math.abs(scale.domain[1] - scale.domain[0]);
        const digits = span > 100 ? 0 : span > 1 ? 1 : 3;
        annotation.value = Number(scale.invert(y).toFixed(digits));
      }
    } else if (annotation.type === 'vertical-line') {
      const scale = cache.xAxis.scale;
      if (scale instanceof BandScale) {
        let best: unknown;
        let bestDistance = Infinity;
        for (const value of scale.domain) {
          const distance = Math.abs(scale.center(value) - x);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = value;
          }
        }
        if (best !== undefined) annotation.value = best;
      } else if (scale instanceof LinearScale) {
        annotation.value = scale.invert(x);
      }
    } else {
      return;
    }
    this.renderDynamicLayers();
    this.requestRender();
  }

  /** Current dimming accounting for the transition animation. */
  private effectiveDimOpacity(): number {
    const configured = this.inputs.highlight?.dimOpacity ?? DEFAULT_DIM_OPACITY;
    return 1 - (1 - configured) * this.hoverT;
  }

  /** Text for the ARIA announcement of the highlighted point. */
  describeHighlight(): string | undefined {
    if (!this.highlight) return undefined;
    const series = this.series.find((instance) => instance.id === this.highlight?.seriesId);
    if (!series) return undefined;
    const content = series.tooltipFor(this.highlight.datumIndex);
    const rows = content.rows.map((row) => `${row.label}: ${row.value}`).join(', ');
    const heading = typeof content.heading === 'string' ? content.heading : content.heading?.text;
    return [heading, rows].filter(Boolean).join(' — ');
  }

  /** Pinch zoom around the gesture center. */
  handlePinch(x: number, y: number, scale: number): void {
    const zoom = this.inputs.zoom;
    if (!zoom?.enabled || scale <= 0) return;
    const inPlot = x >= this.plot.x && x <= this.plot.x + this.plot.width && y >= this.plot.y && y <= this.plot.y + this.plot.height;
    if (!inPlot) return;
    this.zoomByFactor(x, y, 1 / scale);
  }

  /** Keyboard traversal of the first visible series' points. */
  handleKeyStep(delta: number): void {
    const data = this.inputs.data ?? [];
    if (data.length === 0) return;
    const series = this.series.find((instance) => instance.visible);
    if (!series) return;
    const current = this.highlight?.seriesId === series.id ? this.highlight.datumIndex : -1;
    const next = Math.max(0, Math.min(data.length - 1, current + delta));
    this.highlight = { seriesId: series.id, datumIndex: next };
    this.hoverT = 1;
    this.renderDynamicLayers();
    this.requestRender();
  }

  private afterZoomChange(): void {
    this.inputs.listeners?.zoomChange?.({ x: this.zoomX, y: this.zoomY });
    if (!this.suppressSyncBroadcast) {
      const sync = this.inputs.sync;
      if (sync && sync.enabled !== false && sync.zoom !== false) {
        this.registry.getFeature<SyncApi>('sync')?.broadcastZoom(sync.groupId ?? 'default', this, this.zoomX);
      }
    }
    this.layoutAndRender();
    this.requestRender();
  }

  private broadcastHighlightIfSynced(): void {
    const sync = this.inputs.sync;
    if (sync && sync.enabled !== false && sync.nodeInteraction !== false) {
      this.registry.getFeature<SyncApi>('sync')?.broadcastHighlight(sync.groupId ?? 'default', this, this.highlight);
    }
  }

  private emitSelectionChange(): void {
    const listener = this.inputs.listeners?.selectionChange;
    if (!listener) return;
    const data = this.inputs.data ?? [];
    const items: SelectedItem[] = [];
    for (const [seriesId, indices] of this.selectedMap) {
      for (const datumIndex of indices) {
        const datum = data[datumIndex];
        if (datum) items.push({ seriesId, datumIndex, datum });
      }
    }
    listener({ items });
  }

  private selectionActive(): boolean {
    for (const set of this.selectedMap.values()) {
      if (set.size > 0) return true;
    }
    return false;
  }

  private pickNearest(x: number, y: number): SeriesPick | undefined {
    const range = this.inputs.tooltip?.range ?? DEFAULT_PICK_RANGE;
    const searchRadius = range === 'nearest' ? Infinity : range === 'exact' ? 0 : range;
    let best: SeriesPick | undefined;
    for (const series of this.series) {
      if (!series.visible) continue;
      const pick = series.pick(x, y, searchRadius);
      if (pick && pick.distance <= searchRadius + 6 && (best === undefined || pick.distance < best.distance)) {
        best = pick;
      }
    }
    return best;
  }

  destroy(): void {
    this.animator.stop();
    this.hoverAnimator.stop();
    this.leaveSync?.();
    this.tooltip?.destroy();
  }
}

/** Converts a screen selection into a zoom window inside the current window. */
function windowFromSelection(
  current: ZoomWindow,
  c0: number,
  c1: number,
  plotStart: number,
  plotLength: number,
  minRatio: number,
  inverted: boolean,
): ZoomWindow {
  const [start, end] = current;
  const span = end - start;
  let r0 = (Math.min(c0, c1) - plotStart) / plotLength;
  let r1 = (Math.max(c0, c1) - plotStart) / plotLength;
  if (inverted) {
    const t0 = 1 - r1;
    const t1 = 1 - r0;
    r0 = t0;
    r1 = t1;
  }
  let newStart = start + span * Math.max(0, r0);
  let newEnd = start + span * Math.min(1, r1);
  if (newEnd - newStart < minRatio) {
    const center = (newStart + newEnd) / 2;
    newStart = Math.max(0, center - minRatio / 2);
    newEnd = Math.min(1, newStart + minRatio);
  }
  return [newStart, newEnd];
}

function sameHighlight(a: HighlightState | undefined, b: HighlightState | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.seriesId === b.seriesId && a.datumIndex === b.datumIndex;
}

export const cartesianChartModule: ChartWidgetModule = {
  kind: 'chart',
  chartKinds: ['cartesian'],
  create: (scene, registry, requestRender, container) => new CartesianChart(scene, registry, requestRender, container),
};
