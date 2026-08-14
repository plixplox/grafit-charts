import { renderBackground, type BackgroundOptions } from '@/entities/background';
import { hasCaptions, renderCaptions, type CaptionOptions } from '@/entities/caption';
import type { Legend, LegendApi, LegendOptions } from '@/entities/legend';
import type { HighlightOptions } from '@/features/highlight';
import type { ChartListeners, SelectedItem, SelectionOptions } from '@/features/selection';
import type { HtmlTooltip, TooltipApi, TooltipOptions } from '@/features/tooltip';
import { Animator, type AnimationOptions } from '@/shared/animation';
import { warnMissingFeature, type ChartWidgetModule } from '@/shared/kernel';
import type { LocaleOptions } from '@/shared/locale';
import type {
  ChartState,
  ChartWidget,
  HighlightState,
  ImperativeOptions,
  LayoutRect,
  ModuleRegistry,
  NodeRef,
  SelectedNode,
  SeriesPick,
  StandaloneSeriesInstance,
  ThemeContext,
} from '@/shared/kernel';
import { resolvePadding, type Datum, type PaddingValue } from '@/shared/options';
import { Rect, type Group, type Scene } from '@/shared/scene';
import { LabelPlacements } from '@/shared/util';

export interface StandaloneChartInputs {
  data?: Datum[];
  series?: Array<{ type: string }>;
  title?: CaptionOptions;
  subtitle?: CaptionOptions;
  padding?: PaddingValue;
  background?: BackgroundOptions;
  legend?: LegendOptions;
  tooltip?: TooltipOptions;
  highlight?: HighlightOptions;
  animation?: AnimationOptions;
  selection?: SelectionOptions;
  listeners?: ChartListeners;
  locale?: LocaleOptions;
}

const DEFAULT_PADDING = { top: 12, right: 20, bottom: 12, left: 20 };
const LEGEND_GAP = 12;
const DEFAULT_ANIMATION_MS = 600;
/** A drag shorter than this in both axes was a click, not a rubber band. */
const BOX_SELECT_MIN = 4;

/** Widget for axis-less series: hierarchy (treemap/sunburst/pyramid) and flow (sankey/chord). */
export class StandaloneChart implements ChartWidget {
  private inputs: StandaloneChartInputs = {};
  private theme!: ThemeContext;
  private series: StandaloneSeriesInstance[] = [];
  private legend: Legend | undefined;
  private highlight: HighlightState | undefined;
  /** The data under an open tooltip has changed — it is re-read once the layout has run. */
  private tooltipStale = false;
  /** Selected datum indices per series id (Data Selection). */
  private readonly selectedMap = new Map<string, Set<number>>();
  private readonly animator = new Animator();
  private hasAnimated = false;
  private readonly tooltip: HtmlTooltip | undefined;
  /** The rubber band being dragged, in chart coordinates. */
  private selectRect: { x0: number; y0: number; x1: number; y1: number } | undefined;

  constructor(
    private readonly scene: Scene,
    private readonly registry: ModuleRegistry,
    private readonly requestRender: () => void,
    container?: HTMLElement,
  ) {
    this.tooltip =
      container && typeof document !== 'undefined' ? this.registry.getFeature<TooltipApi>('tooltip')?.create(container) : undefined;
  }

  setOptions(inputs: StandaloneChartInputs, theme: ThemeContext): void {
    const previousHighlight = this.highlight;
    this.inputs = inputs;
    this.theme = theme;
    const list = inputs.series ?? [];
    this.series = list.map((seriesOptions, index) => {
      const module = this.registry.getSeries(seriesOptions.type);
      if (!module) {
        throw new Error(`grafit: unknown series type "${seriesOptions.type}"`);
      }
      if (module.chartKind !== 'hierarchy' && module.chartKind !== 'flow') {
        throw new Error(`grafit: series "${seriesOptions.type}" is not supported by this widget`);
      }
      const fills = this.theme.palette.fills;
      return module.create(seriesOptions, {
        id: `${seriesOptions.type}-${index}`,
        colors: {
          fill: fills[index % fills.length] ?? '#436ff4',
          stroke: fills[index % fills.length] ?? '#436ff4',
        },
        theme: this.theme,
        locale: this.inputs.locale,
      }) as StandaloneSeriesInstance;
    });
    if (inputs.tooltip && inputs.tooltip.enabled !== false && !this.tooltip) warnMissingFeature('tooltip');
    const legendApi = this.registry.getFeature<LegendApi>('legend');
    if (!legendApi && inputs.legend !== undefined) warnMissingFeature('legend');
    this.legend = legendApi?.create(inputs.legend, theme);
    // the pointer did not move because the data did: a highlight still pointing
    // at a node is kept, tooltip and all — with the numbers of the new data in it
    this.highlight = this.stillPointsAtSomething(previousHighlight);
    this.tooltipStale = true;
    if (this.hasAnimated || inputs.animation?.enabled === false) {
      this.hasAnimated = true;
      return;
    }
    this.hasAnimated = true;
    this.animator.play(inputs.animation?.duration ?? DEFAULT_ANIMATION_MS, () => {
      this.layoutAndRender();
      this.requestRender();
    });
  }

  /** The rows of a single frame while an update flows into place. */
  setData(data: Datum[]): void {
    this.inputs = { ...this.inputs, data };
    this.tooltipStale = true;
  }

  valueFields(): string[] {
    return [...new Set(this.series.flatMap((series) => series.valueFields?.() ?? []))];
  }

  /**
   * A highlight the new configuration can still answer for. A hierarchy numbers
   * the nodes it draws rather than the rows it was given, so the series is asked
   * whether the node is still there instead of the data being counted.
   */
  private stillPointsAtSomething(highlight: HighlightState | undefined): HighlightState | undefined {
    if (!highlight) return undefined;
    const series = this.series.find((instance) => instance.id === highlight.seriesId && instance.visible);
    return series ? highlight : undefined;
  }

  /** The tooltip on screen, read off the data of the frame while it moves. */
  private refreshTooltip(): void {
    if (!this.tooltip?.visible || !this.highlight || this.inputs.tooltip?.enabled === false) return;
    const found = this.resolveNode(this.highlight);
    if (!found) return;
    this.tooltip.show(found.series.tooltipFor(found.pick.datumIndex), found.pick.x, found.pick.y, this.theme, this.inputs.tooltip);
  }

  layoutAndRender(): void {
    const { width, height } = this.scene;
    const backgroundLayer = this.scene.layer('background');
    const seriesLayer = this.scene.layer('series');
    const legendLayer = this.scene.layer('legend');
    const captionLayer = this.scene.layer('caption');
    const overlayLayer = this.scene.layer('overlay');
    for (const layer of [backgroundLayer, seriesLayer, legendLayer, captionLayer, overlayLayer]) {
      layer.clear();
    }
    this.scene.markDirty();

    renderBackground(backgroundLayer, this.inputs.background, this.theme, width, height);

    const padding = resolvePadding(this.inputs.padding, DEFAULT_PADDING);
    const data = this.inputs.data ?? [];
    for (const series of this.series) series.setData(data);

    const measureText = (text: string, font: string) => this.scene.measureText(text, font);
    const legend = this.legend;
    if (legend?.enabled) legend.setItems(this.series.flatMap((series) => series.legendItems()));
    // a floating legend is anchored to the whole chart area (captions included) and reserves no space
    const floatRect: LayoutRect | undefined =
      legend?.enabled && legend.floating
        ? { x: padding.left, y: padding.top, width: width - padding.left - padding.right, height: height - padding.top - padding.bottom }
        : undefined;
    // captions wrap around the floating legend box, so it has to be measured
    // first — and measured again within a cap when they run out of room beside it
    const obstacle =
      floatRect && legend && hasCaptions(this.inputs.title, this.inputs.subtitle)
        ? (cap?: number) => {
            legend.limitWidth(cap);
            return legend.captionObstacle(floatRect, measureText);
          }
        : undefined;
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

    if (legend?.enabled) {
      const size = legend.measure(measureText, (floatRect ?? avail).width, (floatRect ?? avail).height);
      if (size.width > 0 && size.height > 0) {
        let legendRect: LayoutRect;
        if (floatRect) {
          legendRect = floatRect;
        } else {
          legendRect =
            legend.position === 'right'
              ? { x: avail.x + avail.width - size.width, y: avail.y, width: size.width, height: avail.height }
              : { x: avail.x, y: avail.y + avail.height - size.height, width: avail.width, height: size.height };
          if (legend.position === 'right') {
            avail.width -= size.width + LEGEND_GAP;
          } else {
            avail.height -= size.height + LEGEND_GAP;
          }
        }
        legend.render(legendLayer, legendRect);
      }
    }

    // one guard for the whole render: labels of every series compete for the same room
    const labelGuard = new LabelPlacements(measureText);
    for (const series of this.series) {
      series.update({
        data,
        plot: avail,
        layer: seriesLayer,
        measureText,
        highlight: this.inputs.highlight?.enabled !== false ? this.highlight : undefined,
        animationT: this.animator.t,
        labelGuard,
        selected: this.selectedMap.get(series.id),
        selectionActive: [...this.selectedMap.values()].some((set) => set.size > 0),
        selectionStyle: {
          ...this.inputs.selection?.itemStyle,
          inactiveOpacity: this.inputs.selection?.inactiveOpacity,
        },
      });
    }

    this.renderSelectBox(overlayLayer);

    // the nodes have just been laid out, so a tooltip re-read here finds them
    if (this.tooltipStale) {
      this.tooltipStale = false;
      this.refreshTooltip();
    }
  }

  handlePointerMove(x: number, y: number): void {
    const pick = this.pickNearest(x, y);
    const next: HighlightState | undefined = pick ? { seriesId: pick.seriesId, datumIndex: pick.datumIndex } : undefined;
    if (!sameHighlight(this.highlight, next)) {
      this.highlight = next;
      this.layoutAndRender();
      this.requestRender();
    }
    if (pick && this.tooltip && this.inputs.tooltip?.enabled !== false) {
      const series = this.series.find((instance) => instance.id === pick.seriesId);
      if (series) this.tooltip.show(series.tooltipFor(pick.datumIndex), pick.x, pick.y, this.theme, this.inputs.tooltip);
    } else {
      this.tooltip?.hide();
    }
  }

  handlePointerLeave(): void {
    this.tooltip?.hide();
    if (this.highlight) {
      this.highlight = undefined;
      this.layoutAndRender();
      this.requestRender();
    }
  }

  /** The tooltip addressed by datum: no pointer, the node's own anchor stands in for one. */
  showTooltip(target: NodeRef): boolean {
    const found = this.resolveNode(target);
    if (!found) return false;
    const { series, pick } = found;
    this.highlight = { seriesId: pick.seriesId, datumIndex: pick.datumIndex };
    this.layoutAndRender();
    this.requestRender();
    if (this.tooltip && this.inputs.tooltip?.enabled !== false) {
      this.tooltip.show(series.tooltipFor(pick.datumIndex), pick.x, pick.y, this.theme, this.inputs.tooltip);
    }
    return true;
  }

  hideTooltip(): void {
    this.handlePointerLeave();
  }

  handleClick(x: number, y: number): void {
    const pick = this.pickNearest(x, y);
    if (pick) this.emitNodeClick(pick.seriesId, pick.datumIndex);
    if (!this.inputs.selection?.enabled) return;
    if (pick) {
      this.toggleSelected(pick.seriesId, pick.datumIndex);
    } else {
      // a click on empty space drops the selection
      this.selectedMap.clear();
      this.afterSelectionChange();
    }
  }

  clickNode(target: NodeRef, options?: ImperativeOptions): boolean {
    const found = this.resolveNode(target);
    if (!found) return false;
    if (!options?.silent) this.emitNodeClick(found.pick.seriesId, found.pick.datumIndex);
    if (this.inputs.selection?.enabled) this.toggleSelected(found.pick.seriesId, found.pick.datumIndex, options);
    return true;
  }

  getSelection(): SelectedNode[] {
    return this.collectSelection();
  }

  setSelection(targets: NodeRef[], options?: ImperativeOptions): void {
    const fallbackId = this.series.find((series) => series.visible)?.id;
    this.selectedMap.clear();
    for (const target of targets) {
      const seriesId = target.seriesId ?? fallbackId;
      if (seriesId === undefined) continue;
      const set = this.selectedMap.get(seriesId) ?? new Set<number>();
      set.add(target.datumIndex);
      this.selectedMap.set(seriesId, set);
    }
    this.afterSelectionChange(options);
  }

  private emitNodeClick(seriesId: string, datumIndex: number): void {
    const listener = this.inputs.listeners?.nodeClick;
    if (!listener) return;
    const datum = this.datumOf(seriesId, datumIndex);
    if (datum) listener({ seriesId, datumIndex, datum });
  }

  /**
   * The row a node stands for. A hierarchy numbers every node it draws, nested
   * ones included, so the index of a node addresses the data of the chart only
   * on a tree one level deep — the series is the one that knows.
   */
  private datumOf(seriesId: string, datumIndex: number): Datum | undefined {
    const series = this.series.find((instance) => instance.id === seriesId);
    return series?.datumAt?.(datumIndex) ?? (this.inputs.data ?? [])[datumIndex];
  }

  /** Click semantics of the selection: single replaces it, multiple toggles the node. */
  private toggleSelected(seriesId: string, datumIndex: number, options?: ImperativeOptions): void {
    const multiple = this.inputs.selection?.mode === 'multiple';
    const set = multiple ? (this.selectedMap.get(seriesId) ?? new Set<number>()) : new Set<number>();
    if (!multiple) this.selectedMap.clear();
    if (multiple && set.has(datumIndex)) set.delete(datumIndex);
    else set.add(datumIndex);
    this.selectedMap.set(seriesId, set);
    this.afterSelectionChange(options);
  }

  private afterSelectionChange(options?: ImperativeOptions): void {
    if (!options?.silent) this.inputs.listeners?.selectionChange?.({ items: this.collectSelection() });
    this.layoutAndRender();
    this.requestRender();
  }

  private collectSelection(): SelectedItem[] {
    const items: SelectedItem[] = [];
    for (const [seriesId, indices] of this.selectedMap) {
      for (const datumIndex of indices) {
        const datum = this.datumOf(seriesId, datumIndex);
        if (datum) items.push({ seriesId, datumIndex, datum });
      }
    }
    return items;
  }

  /** The node a reference points at; without a series id the visible ones answer in order. */
  private resolveNode(target: NodeRef): { series: StandaloneSeriesInstance; pick: SeriesPick } | undefined {
    for (const series of this.series) {
      if (!series.visible) continue;
      if (target.seriesId !== undefined && series.id !== target.seriesId) continue;
      const pick = series.nodeAt?.(target.datumIndex);
      if (pick) return { series, pick };
    }
    return undefined;
  }

  handleDoubleClick(): void {}
  handleWheel(): void {}

  /**
   * Rubber-band selection: opt-in through `selection.boxSelect`, and only where
   * a selection can hold more than one node — a band that replaced the whole
   * selection with its last node would be a click with extra steps.
   */
  handleDragStart(x: number, y: number): void {
    this.selectRect = undefined;
    const selection = this.inputs.selection;
    if (!selection?.enabled || selection.boxSelect !== true || selection.mode !== 'multiple') return;
    this.selectRect = { x0: x, y0: y, x1: x, y1: y };
  }

  handleDragMove(x: number, y: number): void {
    if (!this.selectRect) return;
    this.selectRect.x1 = x;
    this.selectRect.y1 = y;
    this.layoutAndRender();
    this.requestRender();
  }

  handleDragEnd(): void {
    const rect = this.selectRect;
    this.selectRect = undefined;
    if (!rect) return;
    // a band too small to have been dragged on purpose is a click; the click
    // handler has already had its say, so this one keeps quiet
    if (Math.abs(rect.x1 - rect.x0) <= BOX_SELECT_MIN && Math.abs(rect.y1 - rect.y0) <= BOX_SELECT_MIN) {
      this.layoutAndRender();
      this.requestRender();
      return;
    }
    for (const series of this.series) {
      if (!series.visible || !series.pickInRect) continue;
      const indices = series.pickInRect(rect.x0, rect.y0, rect.x1, rect.y1);
      if (indices.length === 0) continue;
      const set = this.selectedMap.get(series.id) ?? new Set<number>();
      for (const index of indices) set.add(index);
      this.selectedMap.set(series.id, set);
    }
    this.afterSelectionChange();
  }

  /** The band itself, drawn over everything while the pointer is down. */
  protected renderSelectBox(layer: Group): void {
    const rect = this.selectRect;
    if (!rect) return;
    const box = new Rect();
    box.x = Math.min(rect.x0, rect.x1);
    box.y = Math.min(rect.y0, rect.y1);
    box.width = Math.abs(rect.x1 - rect.x0);
    box.height = Math.abs(rect.y1 - rect.y0);
    box.fill = this.theme.palette.fills[0] ?? '#436ff4';
    box.opacity = 0.15;
    box.stroke = this.theme.palette.fills[0] ?? '#436ff4';
    box.strokeWidth = 1;
    layer.append(box);
  }


  getState(): ChartState {
    return {};
  }

  setState(): void {}

  isZoomed(): boolean {
    return false;
  }

  resetZoom(): void {}

  private pickNearest(x: number, y: number): SeriesPick | undefined {
    for (const series of this.series) {
      if (!series.visible) continue;
      const pick = series.pick(x, y);
      if (pick) return pick;
    }
    return undefined;
  }

  destroy(): void {
    this.animator.stop();
    this.tooltip?.destroy();
  }
}

function sameHighlight(a: HighlightState | undefined, b: HighlightState | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.seriesId === b.seriesId && a.datumIndex === b.datumIndex;
}

export const standaloneChartModule: ChartWidgetModule = {
  kind: 'chart',
  chartKinds: ['hierarchy', 'flow'],
  create: (scene, registry, requestRender, container) => new StandaloneChart(scene, registry, requestRender, container),
};
