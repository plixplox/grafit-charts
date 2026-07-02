import { renderBackground, type BackgroundOptions } from '@/entities/background';
import { renderCaptions, type CaptionOptions } from '@/entities/caption';
import type { Legend, LegendApi, LegendOptions } from '@/entities/legend';
import type { HighlightOptions } from '@/features/highlight';
import type { HtmlTooltip, TooltipApi, TooltipOptions } from '@/features/tooltip';
import { Animator, type AnimationOptions } from '@/shared/animation';
import { warnMissingFeature, type ChartWidgetModule } from '@/shared/kernel';
import type {
  ChartState,
  ChartWidget,
  HighlightState,
  LayoutRect,
  ModuleRegistry,
  SeriesPick,
  StandaloneSeriesInstance,
  ThemeContext,
} from '@/shared/kernel';
import type { Datum, Padding } from '@/shared/options';
import type { Scene } from '@/shared/scene';

export interface StandaloneChartInputs {
  data?: Datum[];
  series?: Array<{ type: string }>;
  title?: CaptionOptions;
  subtitle?: CaptionOptions;
  padding?: Padding;
  background?: BackgroundOptions;
  legend?: LegendOptions;
  tooltip?: TooltipOptions;
  highlight?: HighlightOptions;
  animation?: AnimationOptions;
}

const DEFAULT_PADDING = { top: 12, right: 20, bottom: 12, left: 20 };
const LEGEND_GAP = 12;
const DEFAULT_ANIMATION_MS = 600;

/** Widget for axis-less series: hierarchy (treemap/sunburst/pyramid) and flow (sankey/chord). */
export class StandaloneChart implements ChartWidget {
  private inputs: StandaloneChartInputs = {};
  private theme!: ThemeContext;
  private series: StandaloneSeriesInstance[] = [];
  private legend: Legend | undefined;
  private highlight: HighlightState | undefined;
  private readonly animator = new Animator();
  private hasAnimated = false;
  private readonly tooltip: HtmlTooltip | undefined;

  constructor(
    private readonly scene: Scene,
    private readonly registry: ModuleRegistry,
    private readonly requestRender: () => void,
    container?: HTMLElement,
  ) {
    this.tooltip =
      container && typeof document !== 'undefined'
        ? this.registry.getFeature<TooltipApi>('tooltip')?.create(container)
        : undefined;
  }

  setOptions(inputs: StandaloneChartInputs, theme: ThemeContext): void {
    this.inputs = inputs;
    this.theme = theme;
    this.highlight = undefined;
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
      }) as StandaloneSeriesInstance;
    });
    if (inputs.tooltip && inputs.tooltip.enabled !== false && !this.tooltip) warnMissingFeature('tooltip');
    const legendApi = this.registry.getFeature<LegendApi>('legend');
    if (!legendApi && inputs.legend !== undefined) warnMissingFeature('legend');
    this.legend = legendApi?.create(inputs.legend, theme);
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

  layoutAndRender(): void {
    const { width, height } = this.scene;
    const backgroundLayer = this.scene.layer('background');
    const seriesLayer = this.scene.layer('series');
    const legendLayer = this.scene.layer('legend');
    const captionLayer = this.scene.layer('caption');
    for (const layer of [backgroundLayer, seriesLayer, legendLayer, captionLayer]) {
      layer.clear();
    }
    this.scene.markDirty();

    renderBackground(backgroundLayer, this.inputs.background, this.theme, width, height);

    const padding = { ...DEFAULT_PADDING, ...this.inputs.padding };
    const captions = renderCaptions(captionLayer, this.inputs.title, this.inputs.subtitle, this.theme, width, height, padding);

    const avail: LayoutRect = {
      x: padding.left,
      y: padding.top + captions.top,
      width: width - padding.left - padding.right,
      height: height - padding.top - captions.top - padding.bottom - captions.bottom,
    };

    const data = this.inputs.data ?? [];
    for (const series of this.series) series.setData(data);

    const measureText = (text: string, font: string) => this.scene.measureText(text, font);
    const legend = this.legend;
    if (legend?.enabled) {
      legend.setItems(this.series.flatMap((series) => series.legendItems()));
      // a floating legend is anchored to the whole chart area (captions included) and reserves no space
      const floatRect: LayoutRect | undefined = legend.floating
        ? { x: padding.left, y: padding.top, width: width - padding.left - padding.right, height: height - padding.top - padding.bottom }
        : undefined;
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

    for (const series of this.series) {
      series.update({
        data,
        plot: avail,
        layer: seriesLayer,
        highlight: this.inputs.highlight?.enabled !== false ? this.highlight : undefined,
        animationT: this.animator.t,
      });
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
      if (series) this.tooltip.show(series.tooltipFor(pick.datumIndex), pick.x, pick.y, this.theme);
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

  handleClick(): void {}
  handleDoubleClick(): void {}
  handleWheel(): void {}
  handleDragStart(): void {}
  handleDragMove(): void {}
  handleDragEnd(): void {}

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
