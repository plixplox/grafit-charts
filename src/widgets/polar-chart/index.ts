import { fitPolarGrid, keepClearOf, placeRimLabel, thinLabels, type PolarFit } from './grid-fit';
import { renderBackground, type BackgroundOptions } from '@/entities/background';
import { hasCaptions, renderCaptions, type CaptionOptions } from '@/entities/caption';
import type { Legend, LegendApi, LegendOptions } from '@/entities/legend';
import type { HighlightOptions } from '@/features/highlight';
import type { ChartListeners, SelectedItem, SelectionOptions } from '@/features/selection';
import type { HtmlTooltip, TooltipApi, TooltipOptions } from '@/features/tooltip';
import { Animator, type AnimationOptions } from '@/shared/animation';
import { DEFAULT_DIM_OPACITY, warnMissingFeature, type ChartWidgetModule } from '@/shared/kernel';
import type {
  ChartState,
  ChartWidget,
  HighlightState,
  LayoutRect,
  MeasureText,
  ModuleRegistry,
  PolarSeriesInstance,
  SeriesPick,
  ThemeContext,
} from '@/shared/kernel';
import type { Datum, Padding } from '@/shared/options';
import { BandScale, LinearScale } from '@/shared/scale';
import { Circle, Group, Line, Path, Text, type Scene } from '@/shared/scene';
import { textBounds, type Bounds } from '@/shared/util';

export interface PolarChartInputs {
  data?: Datum[];
  series?: Array<{ type: string }>;
  title?: CaptionOptions;
  subtitle?: CaptionOptions;
  padding?: Padding;
  background?: BackgroundOptions;
  legend?: LegendOptions;
  tooltip?: TooltipOptions;
  highlight?: HighlightOptions;
  selection?: SelectionOptions;
  listeners?: ChartListeners;
  animation?: AnimationOptions;
  initialState?: ChartState;
}

const DEFAULT_PADDING = { top: 12, right: 20, bottom: 12, left: 20 };
const LEGEND_GAP = 12;
const DEFAULT_ANIMATION_MS = 600;
const GRID_RING_COUNT = 4;
/** Breathing room between the outermost ring and the edge of the area. */
const PLOT_INSET = 4;
const MIN_RADIUS = 10;
/** Clearance between the outermost ring and the labels around it. */
const RIM_LABEL_GAP = 10;
const CATEGORY_LABEL_FONT_SIZE = 11;
const RING_LABEL_FONT_SIZE = 10;
/** Ring values sit just right of the vertical and just above their ring. */
const RING_LABEL_GAP = 4;
const RING_LABEL_LIFT = 2;
/** Inverted layout: gap between the centre line and the category names. */
const INVERSE_LABEL_GAP = 6;

/** A category label around the rim, ready to be placed on its spoke. */
interface RimLabel {
  text: string;
  angle: number;
  width: number;
}

export class PolarChart implements ChartWidget {
  private inputs: PolarChartInputs = {};
  private theme!: ThemeContext;
  private series: PolarSeriesInstance[] = [];
  private legend: Legend | undefined;
  private readonly hiddenSeries = new Set<string>();
  private highlight: HighlightState | undefined;
  private readonly animator = new Animator();
  private hasAnimated = false;
  private readonly hoverAnimator = new Animator();
  private hoverT = 0;
  private fadeHighlight: HighlightState | undefined;
  /** Highlight transition between nodes: the new one slides out, the previous one slides back. */
  private readonly popAnimator = new Animator();
  private popT = 1;
  private switchFrom: HighlightState | undefined;
  /** Layout rebuild animation (toggle via legend). */
  private readonly transitionAnimator = new Animator();
  private transitionT: number | undefined;
  private readonly tooltip: HtmlTooltip | undefined;
  private readonly selectedMap = new Map<string, Set<number>>();

  constructor(
    private readonly scene: Scene,
    private readonly registry: ModuleRegistry,
    private readonly requestRender: () => void,
    container?: HTMLElement,
  ) {
    this.tooltip =
      container && typeof document !== 'undefined' ? this.registry.getFeature<TooltipApi>('tooltip')?.create(container) : undefined;
  }

  setOptions(inputs: PolarChartInputs, theme: ThemeContext): void {
    this.inputs = inputs;
    this.theme = theme;
    this.highlight = undefined;
    this.buildSeries();
    if (inputs.tooltip && inputs.tooltip.enabled !== false && !this.tooltip) warnMissingFeature('tooltip');
    const legendApi = this.registry.getFeature<LegendApi>('legend');
    if (!legendApi && inputs.legend !== undefined) warnMissingFeature('legend');
    this.legend = legendApi?.create(inputs.legend, theme);
    if (inputs.initialState) this.setState(inputs.initialState);
    this.maybeAnimateEntrance();
  }

  private buildSeries(): void {
    const list = this.inputs.series ?? [];
    this.series = list.map((seriesOptions, index) => {
      const module = this.registry.getSeries(seriesOptions.type);
      if (!module) {
        throw new Error(`grafit: unknown series type "${seriesOptions.type}"`);
      }
      if (module.chartKind !== 'polar') {
        throw new Error(`grafit: series "${seriesOptions.type}" is not supported by the polar chart`);
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
      }) as PolarSeriesInstance;
      if (this.hiddenSeries.has(instance.id)) instance.visible = false;
      return instance;
    });
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

  layoutAndRender(): void {
    const { width, height } = this.scene;
    const backgroundLayer = this.scene.layer('background');
    const gridLayer = this.scene.layer('grid');
    const seriesLayer = this.scene.layer('series');
    const legendLayer = this.scene.layer('legend');
    const captionLayer = this.scene.layer('caption');
    for (const layer of [backgroundLayer, gridLayer, seriesLayer, legendLayer, captionLayer]) {
      layer.clear();
    }
    this.scene.markDirty();

    renderBackground(backgroundLayer, this.inputs.background, this.theme, width, height);

    const padding = { ...DEFAULT_PADDING, ...this.inputs.padding };
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

    if (legend?.enabled) {
      const size = legend.measure(measureText, (floatRect ?? avail).width, (floatRect ?? avail).height);
      if (size.width > 0 && size.height > 0) {
        let legendRect: LayoutRect;
        if (floatRect) {
          legendRect = floatRect;
        } else {
          switch (legend.position) {
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
            default:
              legendRect = { x: avail.x, y: avail.y + avail.height - size.height, width: avail.width, height: size.height };
              avail.height -= size.height + LEGEND_GAP;
          }
        }
        legend.render(legendLayer, legendRect);
      }
    }

    let centerX = avail.x + avail.width / 2;
    let centerY = avail.y + avail.height / 2;
    let radius = Math.max(MIN_RADIUS, Math.min(avail.width, avail.height) / 2 - PLOT_INSET);

    const visibleSeries = this.series.filter((series) => series.visible);
    const inverseLayout = visibleSeries.some((series) => series.polarLayout?.() === 'radius-category');
    const needsAxes = !inverseLayout && visibleSeries.some((series) => series.needsPolarAxes());

    let radiusBandScale: BandScale<unknown> | undefined;
    let angleValueScale: LinearScale | undefined;
    if (inverseLayout) {
      const categories = this.collectAngleCategories(visibleSeries, data);
      let max = 0;
      for (const series of visibleSeries) {
        const domain = series.radiusDomain(data);
        if (domain) max = Math.max(max, domain[1]);
      }
      angleValueScale = new LinearScale([0, max || 1], [0, Math.PI * 1.5]);
      angleValueScale.nice(4);

      const fit = this.fitInverseGrid(avail, radius, categories, angleValueScale, measureText);
      centerX = fit.centerX;
      centerY = fit.centerY;
      radius = fit.radius;

      radiusBandScale = new BandScale(categories, [radius * 0.25, radius]);
      radiusBandScale.paddingInner = 0.25;
      radiusBandScale.paddingOuter = 0.05;
      this.renderInverseGrid(gridLayer, centerX, centerY, radiusBandScale, angleValueScale, measureText);
    }

    let angleScale: BandScale<unknown> | undefined;
    let radiusScale: LinearScale | undefined;
    if (needsAxes) {
      const categories = this.collectAngleCategories(visibleSeries, data);
      angleScale = new BandScale(categories, [0, Math.PI * 2]);
      angleScale.paddingInner = 0;
      angleScale.paddingOuter = 0;

      let min = Infinity;
      let max = -Infinity;
      for (const series of visibleSeries) {
        const domain = series.radiusDomain(data);
        if (!domain) continue;
        min = Math.min(min, domain[0]);
        max = Math.max(max, domain[1]);
      }
      if (min > max) {
        min = 0;
        max = 1;
      }

      const labels = this.rimLabels(categories, angleScale, measureText);
      const fit = this.fitCategoryGrid(avail, radius, labels);
      centerX = fit.centerX;
      centerY = fit.centerY;
      radius = fit.radius;

      radiusScale = new LinearScale([Math.min(0, min), max], [0, radius]);
      radiusScale.nice(GRID_RING_COUNT);
      // labels that would collide at this radius are dropped, spokes stay
      const kept = thinLabels(this.rimLabelBounds(labels, centerX, centerY, radius), { closed: true });
      this.renderPolarGrid(
        gridLayer,
        centerX,
        centerY,
        angleScale,
        radiusScale,
        visibleSeries,
        kept.flatMap((index) => labels[index] ?? []),
        measureText,
      );
    }

    const slots = this.assignAngleSlots(visibleSeries);
    for (const series of this.series) {
      series.update({
        data,
        centerX,
        centerY,
        radius,
        area: avail,
        measureText,
        layer: seriesLayer,
        highlight: this.inputs.highlight?.enabled !== false ? (this.highlight ?? this.fadeHighlight) : undefined,
        dimOpacity: this.effectiveDimOpacity(),
        highlightT: this.switchFrom ? this.popT : this.hoverT,
        fadeHighlight: this.switchFrom,
        fadeHighlightT: this.switchFrom ? 1 - this.popT : undefined,
        transitionT: this.transitionT,
        selected: this.selectedMap.get(series.id),
        selectionActive: [...this.selectedMap.values()].some((set) => set.size > 0),
        selectionStyle: {
          ...this.inputs.selection?.itemStyle,
          inactiveOpacity: this.inputs.selection?.inactiveOpacity,
        },
        animationT: this.animator.t,
        angleScale,
        radiusScale,
        radiusBandScale,
        angleValueScale,
        group: slots.get(series.id),
      });
    }

    if (data.length === 0 || visibleSeries.length === 0) {
      const note = new Text();
      note.text = 'No data to display';
      note.x = centerX;
      note.y = centerY;
      note.textAlign = 'center';
      note.textBaseline = 'middle';
      note.fontSize = 13;
      note.fontFamily = this.theme.fontFamily;
      note.fill = this.theme.mutedColor;
      seriesLayer.append(note);
    }
  }

  /** Font of the labels around the rim — the same one renderPolarGrid draws with. */
  private rimLabelFont(fontSize: number): string {
    return `normal ${fontSize}px ${this.theme.fontFamily}`;
  }

  /** Category labels around the rim: text, its spoke angle and its measured width. */
  private rimLabels(categories: unknown[], angleScale: BandScale<unknown>, measureText: MeasureText): RimLabel[] {
    const font = this.rimLabelFont(CATEGORY_LABEL_FONT_SIZE);
    return categories.map((category) => {
      const text = String(category);
      return { text, angle: angleScale.center(category), width: measureText(text, font) };
    });
  }

  /** Boxes the rim labels cover for a given grid radius. */
  private rimLabelBounds(labels: RimLabel[], centerX: number, centerY: number, radius: number): Bounds[] {
    return labels.map((label) => {
      const placed = placeRimLabel(centerX, centerY, radius + RIM_LABEL_GAP, label.angle);
      return textBounds(placed.x, placed.y, label.width, CATEGORY_LABEL_FONT_SIZE, placed.align, placed.baseline);
    });
  }

  /** Grid radius (and centre) that keeps the category labels inside the area. */
  private fitCategoryGrid(area: LayoutRect, startRadius: number, labels: RimLabel[]): PolarFit {
    return fitPolarGrid(area, startRadius, (centerX, centerY, radius) => this.rimLabelBounds(labels, centerX, centerY, radius));
  }

  /**
   * Inverted layout (radial-bar): category names sit to the left of the centre,
   * one per ring, and the value ticks ride the rim.
   */
  private fitInverseGrid(
    area: LayoutRect,
    startRadius: number,
    categories: unknown[],
    angleValueScale: LinearScale,
    measureText: MeasureText,
  ): PolarFit {
    const categoryFont = this.rimLabelFont(CATEGORY_LABEL_FONT_SIZE);
    const tickFont = this.rimLabelFont(RING_LABEL_FONT_SIZE);
    const names = categories.map((category) => measureText(String(category), categoryFont));
    const ticks = angleValueScale
      .ticks(4)
      .filter((tick) => tick > 0)
      .map((tick) => ({ angle: angleValueScale.convert(tick), width: measureText(String(tick), tickFont) }));
    return fitPolarGrid(area, startRadius, (centerX, centerY, radius) => [
      // the widest category name, measured from the innermost ring it can sit on
      ...names.map((width) =>
        textBounds(centerX - INVERSE_LABEL_GAP, centerY - radius, width, CATEGORY_LABEL_FONT_SIZE, 'right', 'middle'),
      ),
      ...ticks.map((tick) => {
        const at = placeRimLabel(centerX, centerY, radius + RIM_LABEL_GAP, tick.angle);
        return textBounds(at.x, at.y, tick.width, RING_LABEL_FONT_SIZE, 'center', 'middle');
      }),
    ]);
  }

  /** Grid: rings (polygon for radar, circles for radial), spokes, labels. */
  private renderPolarGrid(
    layer: Group,
    centerX: number,
    centerY: number,
    angleScale: BandScale<unknown>,
    radiusScale: LinearScale,
    visibleSeries: PolarSeriesInstance[],
    rimLabels: RimLabel[],
    measureText: MeasureText,
  ): void {
    const theme = this.theme;
    const categories = angleScale.domain;
    const polygonal = visibleSeries.some((series) => series.type.startsWith('radar'));
    const maxRadius = radiusScale.range[1];
    const ticks = radiusScale.ticks(GRID_RING_COUNT).filter((tick) => tick > 0);

    for (const tick of ticks) {
      const r = radiusScale.convert(tick);
      if (polygonal && categories.length > 2) {
        const ring = new Path();
        categories.forEach((category, index) => {
          const angle = angleScale.center(category);
          const point = pointAt(centerX, centerY, angle, r);
          if (index === 0) ring.moveTo(point.x, point.y);
          else ring.lineTo(point.x, point.y);
        });
        ring.closePath();
        ring.stroke = theme.mutedColor;
        ring.opacity = 0.3;
        layer.append(ring);
      } else {
        const ring = new Circle();
        ring.x = centerX;
        ring.y = centerY;
        ring.radius = r;
        ring.stroke = theme.mutedColor;
        ring.opacity = 0.3;
        layer.append(ring);
      }
    }

    // a spoke per category — the web stays whole even where a label was dropped
    for (const category of categories) {
      const end = pointAt(centerX, centerY, angleScale.center(category), maxRadius);
      const spoke = new Line();
      spoke.x1 = centerX;
      spoke.y1 = centerY;
      spoke.x2 = end.x;
      spoke.y2 = end.y;
      spoke.stroke = theme.mutedColor;
      spoke.opacity = 0.3;
      layer.append(spoke);
    }

    const rimBounds = rimLabels.map((rimLabel) => {
      const placed = placeRimLabel(centerX, centerY, maxRadius + RIM_LABEL_GAP, rimLabel.angle);
      const label = new Text();
      label.text = rimLabel.text;
      label.x = placed.x;
      label.y = placed.y;
      label.fontSize = CATEGORY_LABEL_FONT_SIZE;
      label.fontFamily = theme.fontFamily;
      label.fill = theme.mutedColor;
      label.textAlign = placed.align;
      label.textBaseline = placed.baseline;
      layer.append(label);
      return textBounds(placed.x, placed.y, rimLabel.width, CATEGORY_LABEL_FONT_SIZE, placed.align, placed.baseline);
    });

    // ring values climb the vertical at twelve o'clock, where the category
    // label of the first spoke already is: the outermost one gives way to it
    const ringFont = this.rimLabelFont(RING_LABEL_FONT_SIZE);
    const ringLabels = ticks.map((tick) => {
      const text = String(tick);
      const x = centerX + RING_LABEL_GAP;
      const y = centerY - radiusScale.convert(tick) - RING_LABEL_LIFT;
      return { text, x, y, bounds: textBounds(x, y, measureText(text, ringFont), RING_LABEL_FONT_SIZE, 'left', 'alphabetic') };
    });
    for (const index of keepClearOf(
      ringLabels.map((ring) => ring.bounds),
      rimBounds,
    )) {
      const ring = ringLabels[index];
      if (!ring) continue;
      const label = new Text();
      label.text = ring.text;
      label.x = ring.x;
      label.y = ring.y;
      label.fontSize = RING_LABEL_FONT_SIZE;
      label.fontFamily = theme.fontFamily;
      label.fill = theme.mutedColor;
      layer.append(label);
    }
  }

  /** Inverted layout grid (radial-bar): category rings + value spokes. */
  private renderInverseGrid(
    layer: Group,
    centerX: number,
    centerY: number,
    radiusBandScale: BandScale<unknown>,
    angleValueScale: LinearScale,
    measureText: MeasureText,
  ): void {
    const theme = this.theme;
    const categories = radiusBandScale.domain;
    for (const category of categories) {
      const ring = new Circle();
      ring.x = centerX;
      ring.y = centerY;
      ring.radius = radiusBandScale.center(category);
      ring.stroke = theme.mutedColor;
      ring.opacity = 0.2;
      layer.append(ring);
    }

    // names stack up the left side, a ring apart; close rings share a row, so
    // the ones that would collide are dropped — this run does not wrap around
    const nameBounds = categories.map((category) =>
      textBounds(
        centerX - INVERSE_LABEL_GAP,
        centerY - radiusBandScale.center(category),
        measureText(String(category), this.rimLabelFont(CATEGORY_LABEL_FONT_SIZE)),
        CATEGORY_LABEL_FONT_SIZE,
        'right',
        'middle',
      ),
    );
    for (const index of thinLabels(nameBounds)) {
      const category = categories[index];
      if (category === undefined) continue;
      const label = new Text();
      label.text = String(category);
      label.x = centerX - INVERSE_LABEL_GAP;
      label.y = centerY - radiusBandScale.center(category);
      label.textAlign = 'right';
      label.textBaseline = 'middle';
      label.fontSize = CATEGORY_LABEL_FONT_SIZE;
      label.fontFamily = theme.fontFamily;
      label.fill = theme.mutedColor;
      layer.append(label);
    }
    const maxRadius = radiusBandScale.range[1];
    for (const tick of angleValueScale.ticks(4)) {
      if (tick <= 0) continue;
      const angle = angleValueScale.convert(tick);
      const end = { x: centerX + Math.sin(angle) * maxRadius, y: centerY - Math.cos(angle) * maxRadius };
      const spoke = new Line();
      spoke.x1 = centerX;
      spoke.y1 = centerY;
      spoke.x2 = end.x;
      spoke.y2 = end.y;
      spoke.stroke = theme.mutedColor;
      spoke.opacity = 0.2;
      layer.append(spoke);
      const at = placeRimLabel(centerX, centerY, maxRadius + RIM_LABEL_GAP, angle);
      const label = new Text();
      label.text = String(tick);
      label.x = at.x;
      label.y = at.y;
      label.textAlign = 'center';
      label.textBaseline = 'middle';
      label.fontSize = RING_LABEL_FONT_SIZE;
      label.fontFamily = theme.fontFamily;
      label.fill = theme.mutedColor;
      layer.append(label);
    }
  }

  private collectAngleCategories(series: PolarSeriesInstance[], data: Datum[]): unknown[] {
    const seen = new Set<unknown>();
    const categories: unknown[] = [];
    for (const instance of series) {
      for (const value of instance.angleValues(data)) {
        if (!seen.has(value)) {
          seen.add(value);
          categories.push(value);
        }
      }
    }
    return categories;
  }

  private assignAngleSlots(series: PolarSeriesInstance[]): Map<string, { index: number; count: number }> {
    const sharing = series.filter((instance) => instance.occupiesAngleSlot());
    const assignment = new Map<string, { index: number; count: number }>();
    sharing.forEach((instance, index) => {
      assignment.set(instance.id, { index, count: sharing.length });
    });
    return assignment;
  }

  // ---------------------------------------------------------------- events

  handlePointerMove(x: number, y: number): void {
    const pick = this.pickNearest(x, y);
    const next: HighlightState | undefined = pick ? { seriesId: pick.seriesId, datumIndex: pick.datumIndex } : undefined;
    if (!sameHighlight(this.highlight, next)) {
      const previous = this.highlight;
      this.highlight = next;
      if (next && !previous) {
        this.animateHover(1);
      } else if (!next && previous) {
        this.fadeHighlight = previous;
        this.animateHover(0);
      } else if (next && previous) {
        this.switchFrom = previous;
        this.popAnimator.play(140, (k) => {
          this.popT = k;
          if (k >= 1) this.switchFrom = undefined;
          this.layoutAndRender();
          this.requestRender();
        });
      } else {
        this.layoutAndRender();
        this.requestRender();
      }
    }
    if (pick && this.tooltip && this.inputs.tooltip?.enabled !== false) {
      const series = this.series.find((instance) => instance.id === pick.seriesId);
      if (series) this.tooltip.show(series.tooltipFor(pick.datumIndex), ...this.tooltipAnchor(pick, x, y), this.theme, this.inputs.tooltip);
    } else {
      this.tooltip?.hide();
    }
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
    if (this.highlight) {
      this.fadeHighlight = this.highlight;
      this.highlight = undefined;
      this.animateHover(0);
    }
  }

  /** Smooth fade in/out of dimming (same as in the cartesian widget). */
  private animateHover(target: number): void {
    const start = this.hoverT;
    if (start === target) {
      this.layoutAndRender();
      this.requestRender();
      return;
    }
    this.hoverAnimator.play(140, (k) => {
      this.hoverT = start + (target - start) * k;
      if (target === 0 && this.hoverT <= 0.02) this.fadeHighlight = undefined;
      this.layoutAndRender();
      this.requestRender();
    });
  }

  private effectiveDimOpacity(): number {
    const configured = this.inputs.highlight?.dimOpacity ?? DEFAULT_DIM_OPACITY;
    return 1 - (1 - configured) * this.hoverT;
  }

  handleClick(x: number, y: number): void {
    // a floating legend overlays the plot — its items win over point picking
    if (this.legend?.enabled && this.legend.floating && this.legend.hitTest(x, y) !== undefined) {
      this.handleLegendClick(x, y);
      return;
    }
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
      const listener = this.inputs.listeners?.selectionChange;
      if (listener) {
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
      this.layoutAndRender();
      this.requestRender();
      return;
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
    // pie/donut sector items: id in the form "<seriesId>#<index>"
    const hashIndex = seriesId.lastIndexOf('#');
    if (hashIndex > 0) {
      const owner = this.series.find((instance) => instance.id === seriesId.slice(0, hashIndex));
      const itemIndex = Number(seriesId.slice(hashIndex + 1));
      if (owner?.toggleItem && Number.isFinite(itemIndex)) {
        owner.toggleItem(itemIndex);
        const item = owner.legendItems().find((entry) => entry.seriesId === seriesId);
        this.inputs.listeners?.legendItemClick?.({ seriesId, visible: item?.visible !== false });
        // smooth re-layout of slice shares
        this.transitionAnimator.play(240, (k) => {
          this.transitionT = k >= 1 ? undefined : k;
          this.layoutAndRender();
          this.requestRender();
        });
      }
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

  handleDoubleClick(): void {}
  handleWheel(): void {}
  handleDragStart(): void {}
  handleDragMove(): void {}
  handleDragEnd(): void {}

  getState(): ChartState {
    return { hiddenSeries: [...this.hiddenSeries] };
  }

  setState(state: ChartState): void {
    if (state.hiddenSeries) {
      this.hiddenSeries.clear();
      for (const id of state.hiddenSeries) this.hiddenSeries.add(id);
      for (const series of this.series) {
        series.visible = !this.hiddenSeries.has(series.id);
      }
    }
  }

  isZoomed(): boolean {
    return false;
  }

  resetZoom(): void {}

  private pickNearest(x: number, y: number): SeriesPick | undefined {
    let best: SeriesPick | undefined;
    for (const series of this.series) {
      if (!series.visible) continue;
      const pick = series.pick(x, y);
      if (pick && (best === undefined || pick.distance < best.distance)) {
        best = pick;
      }
    }
    return best;
  }

  destroy(): void {
    this.animator.stop();
    this.hoverAnimator.stop();
    this.popAnimator.stop();
    this.transitionAnimator.stop();
    this.tooltip?.destroy();
  }
}

function pointAt(centerX: number, centerY: number, angle: number, radius: number): { x: number; y: number } {
  return { x: centerX + Math.sin(angle) * radius, y: centerY - Math.cos(angle) * radius };
}

function sameHighlight(a: HighlightState | undefined, b: HighlightState | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.seriesId === b.seriesId && a.datumIndex === b.datumIndex;
}

export const polarChartModule: ChartWidgetModule = {
  kind: 'chart',
  chartKinds: ['polar'],
  create: (scene, registry, requestRender, container) => new PolarChart(scene, registry, requestRender, container),
};
