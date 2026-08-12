import {
  axisFont,
  axisLabelText,
  DEFAULT_RING_COUNT,
  resolveAxisLine,
  resolveGridLine,
  resolveLabelStyle,
  resolveTitleStyle,
  titleInsets,
  type PolarAxesOptions,
  type ResolvedAxisLine,
  type ResolvedAxisText,
  type ResolvedGridLine,
} from './axes';
import { fitPolarGrid, keepClearOf, placeRimLabel, thinLabels, type PolarFit } from './grid-fit';
import { renderBackground, type BackgroundOptions } from '@/entities/background';
import { hasCaptions, renderCaptions, type CaptionOptions } from '@/entities/caption';
import type { Legend, LegendApi, LegendOptions } from '@/entities/legend';
import type { HighlightOptions } from '@/features/highlight';
import type { ChartListeners, SelectedItem, SelectionOptions } from '@/features/selection';
import type { HtmlTooltip, TooltipApi, TooltipOptions } from '@/features/tooltip';
import { Animator, type AnimationOptions } from '@/shared/animation';
import { DEFAULT_DIM_OPACITY, FONT_STEP, themeFont, warnMissingFeature, type ChartWidgetModule } from '@/shared/kernel';
import type {
  ChartState,
  ChartWidget,
  HighlightState,
  ImperativeOptions,
  LayoutRect,
  MeasureText,
  ModuleRegistry,
  NodeRef,
  PolarSeriesInstance,
  SelectedNode,
  SeriesPick,
  ThemeContext,
  TooltipContentData,
} from '@/shared/kernel';
import type { LocaleOptions } from '@/shared/locale';
import { resolvePadding, type Datum, type PaddingValue } from '@/shared/options';
import { BandScale, LinearScale } from '@/shared/scale';
import { Circle, Group, Line, Path, Rect, Text, type Scene } from '@/shared/scene';
import { LabelPlacements, textBounds, type Bounds } from '@/shared/util';

export type {
  PolarAxesOptions,
  PolarAngleAxisOptions,
  PolarRadiusAxisOptions,
  PolarAxisLabelOptions,
  PolarAxisLabelParams,
  PolarAxisLineOptions,
  PolarAxisTitleOptions,
  PolarGridLineOptions,
} from './axes';

export interface PolarChartInputs {
  data?: Datum[];
  series?: Array<{ type: string }>;
  title?: CaptionOptions;
  subtitle?: CaptionOptions;
  padding?: PaddingValue;
  background?: BackgroundOptions;
  legend?: LegendOptions;
  tooltip?: TooltipOptions;
  highlight?: HighlightOptions;
  selection?: SelectionOptions;
  listeners?: ChartListeners;
  animation?: AnimationOptions;
  initialState?: ChartState;
  locale?: LocaleOptions;
  /**
   * The web as a pair of axes: the categories around the rim and the values
   * along the radius, each with its grid, its line, its labels and its title.
   */
  axes?: PolarAxesOptions;
}

const DEFAULT_PADDING = { top: 12, right: 20, bottom: 12, left: 20 };
const LEGEND_GAP = 12;
const DEFAULT_ANIMATION_MS = 600;
/** A drag shorter than this in both axes was a click, not a rubber band. */
const BOX_SELECT_MIN = 4;
/** Breathing room between the outermost ring and the edge of the area. */
const PLOT_INSET = 4;
const MIN_RADIUS = 10;
/** Clearance between the outermost ring and the labels around it. */
const RIM_LABEL_GAP = 10;
/** Ring values sit just right of the vertical and just above their ring. */
const RING_LABEL_GAP = 4;
const RING_LABEL_LIFT = 2;
/** Inverted layout: gap between the centre line and the category names. */
const INVERSE_LABEL_GAP = 6;
/** Breathing room between an axis title and the chart it names. */
const AXIS_TITLE_GAP = 6;
/** The inverted layout carries more rings, so its web fades back further. */
const INVERSE_GRID_OPACITY = 0.2;
/** Rings closer together than this, in px, are one line — one of them goes. */
const RING_EPSILON = 0.5;

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
        locale: this.inputs.locale,
      }) as PolarSeriesInstance;
      this.applyHiddenState(instance);
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
    // the web runs under the data, but the numbers it is read by must not: the
    // value at the centre of a rose would be buried by the first petal drawn
    const axisForegroundLayer = this.scene.layer('axis-foreground');
    const legendLayer = this.scene.layer('legend');
    const captionLayer = this.scene.layer('caption');
    const overlayLayer = this.scene.layer('overlay');
    for (const layer of [backgroundLayer, gridLayer, seriesLayer, axisForegroundLayer, legendLayer, captionLayer, overlayLayer]) {
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

    // the titles stand outside the web, so the room they take is gone before
    // the grid is fitted to what is left
    const angleTitle = resolveTitleStyle(this.inputs.axes?.angle?.title, this.theme, themeFont(this.theme, FONT_STEP.label));
    const radiusTitle = resolveTitleStyle(this.inputs.axes?.radius?.title, this.theme, themeFont(this.theme, FONT_STEP.label));
    const titles = titleInsets(angleTitle, radiusTitle, AXIS_TITLE_GAP);
    const titleArea: LayoutRect = { ...avail };
    avail.x += titles.left;
    avail.width -= titles.left;
    avail.height -= titles.bottom;

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
      this.renderInverseGrid(gridLayer, axisForegroundLayer, centerX, centerY, radiusBandScale, angleValueScale, measureText);
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

      // bounds the options gave stand as they are; the rest is what the data asked for
      const axis = this.inputs.axes?.radius;
      radiusScale = new LinearScale([axis?.min ?? Math.min(0, min), axis?.max ?? max], [0, radius]);
      if (axis?.nice !== false) radiusScale.nice(this.ringCount);
      if (axis?.min !== undefined || axis?.max !== undefined) {
        radiusScale.domain = [axis.min ?? radiusScale.domain[0], axis.max ?? radiusScale.domain[1]];
      }
      // labels that would collide at this radius are dropped, spokes stay
      const kept = thinLabels(this.rimLabelBounds(labels, centerX, centerY, radius), { closed: true });
      this.renderPolarGrid(
        gridLayer,
        axisForegroundLayer,
        centerX,
        centerY,
        angleScale,
        radiusScale,
        visibleSeries,
        kept.flatMap((index) => labels[index] ?? []),
        measureText,
      );
    }

    this.renderAxisTitles(gridLayer, titleArea, angleTitle, radiusTitle);

    const slots = this.assignAngleSlots(visibleSeries);
    // one guard for the whole frame: series are asked in drawing order, so of
    // two labels after the same spot the one drawn first keeps it
    const labelGuard = new LabelPlacements(measureText);
    for (const series of this.series) {
      series.update({
        data,
        centerX,
        centerY,
        radius,
        area: avail,
        measureText,
        layer: seriesLayer,
        labelGuard,
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

    this.renderSelectBox(overlayLayer);

    if (data.length === 0 || visibleSeries.length === 0) {
      const note = new Text();
      note.text = 'No data to display';
      note.x = centerX;
      note.y = centerY;
      note.textAlign = 'center';
      note.textBaseline = 'middle';
      note.fontSize = themeFont(this.theme, FONT_STEP.subtitle);
      note.fontFamily = this.theme.fontFamily;
      note.fill = this.theme.mutedColor;
      seriesLayer.append(note);
    }
  }

  /** Category names around the rim. */
  private get categoryLabelSize(): number {
    return themeFont(this.theme, FONT_STEP.label);
  }

  /** Ring values — a step smaller than the categories they sit among. */
  private get ringLabelSize(): number {
    return themeFont(this.theme, FONT_STEP.small);
  }

  /**
   * Style of the category names, and of the ring values. The grid is fitted to
   * the labels before it is drawn, so both passes have to ask the same question
   * — a label measured in one font and drawn in another would not fit the room
   * kept for it.
   */
  private get categoryStyle(): ResolvedAxisText {
    return resolveLabelStyle(this.inputs.axes?.angle?.label, this.theme, this.categoryLabelSize);
  }

  private get valueStyle(): ResolvedAxisText {
    return resolveLabelStyle(this.inputs.axes?.radius?.label, this.theme, this.ringLabelSize);
  }

  /**
   * Category labels around the rim: the text a formatter settled on, its spoke
   * angle and its measured width.
   */
  private rimLabels(categories: unknown[], angleScale: BandScale<unknown>, measureText: MeasureText): RimLabel[] {
    const font = axisFont(this.categoryStyle);
    const options = this.inputs.axes?.angle?.label;
    return categories.map((category, index) => {
      const text = axisLabelText(category, index, options);
      return { text, angle: angleScale.center(category), width: measureText(text, font) };
    });
  }

  /** Boxes the rim labels cover for a given grid radius; none where they are switched off. */
  private rimLabelBounds(labels: RimLabel[], centerX: number, centerY: number, radius: number): Bounds[] {
    const style = this.categoryStyle;
    if (!style.visible) return [];
    return labels.map((label) => {
      const placed = placeRimLabel(centerX, centerY, radius + RIM_LABEL_GAP, label.angle);
      return textBounds(placed.x, placed.y, label.width, style.size, placed.align, placed.baseline);
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
    const categoryStyle = this.categoryStyle;
    const valueStyle = this.valueStyle;
    const categoryFont = axisFont(categoryStyle);
    const tickFont = axisFont(valueStyle);
    const names = categoryStyle.visible
      ? categories.map((category, index) => measureText(axisLabelText(category, index, this.inputs.axes?.angle?.label), categoryFont))
      : [];
    const ticks = valueStyle.visible
      ? angleValueScale.ticks(this.ringCount).map((tick, index) => ({
          angle: angleValueScale.convert(tick),
          width: measureText(axisLabelText(tick, index, this.inputs.axes?.radius?.label), tickFont),
        }))
      : [];
    return fitPolarGrid(area, startRadius, (centerX, centerY, radius) => [
      // the widest category name, measured from the innermost ring it can sit on
      ...names.map((width) => textBounds(centerX - INVERSE_LABEL_GAP, centerY - radius, width, categoryStyle.size, 'right', 'middle')),
      ...ticks.map((tick) => {
        const at = placeRimLabel(centerX, centerY, radius + RIM_LABEL_GAP, tick.angle);
        return textBounds(at.x, at.y, tick.width, valueStyle.size, 'center', 'middle');
      }),
    ]);
  }

  /**
   * Grid: rings (polygon for radar, circles for radial), spokes, labels. The
   * web goes on `layer`, under the data; the labels on `labelLayer`, over it.
   */
  private renderPolarGrid(
    layer: Group,
    labelLayer: Group,
    centerX: number,
    centerY: number,
    angleScale: BandScale<unknown>,
    radiusScale: LinearScale,
    visibleSeries: PolarSeriesInstance[],
    rimLabels: RimLabel[],
    measureText: MeasureText,
  ): void {
    const axes = this.inputs.axes;
    const categories = angleScale.domain;
    const polygonal = visibleSeries.some((series) => series.type.startsWith('radar'));
    const corners = polygonal && categories.length > 2 ? categories.map((category) => angleScale.center(category)) : undefined;
    const maxRadius = radiusScale.range[1];
    // every tick of the value axis, the one at the centre included: it has no
    // ring to draw, but it is still a number the web is read by
    const ticks = radiusScale.ticks(this.ringCount).map((tick) => ({ value: tick, radius: radiusScale.convert(tick) }));
    const rings = resolveGridLine(axes?.radius?.gridLine, this.theme);
    const spokes = resolveGridLine(axes?.angle?.gridLine, this.theme);
    // both axes get an outline of their own, as a cartesian pair does: the rim
    // closes the categories, the vertical carries the values from the centre out
    const rim = resolveAxisLine(axes?.angle?.line, this.theme, this.theme.axis.line);
    const valueLine = resolveAxisLine(axes?.radius?.line, this.theme, this.theme.axis.line);
    const { categoryStyle, valueStyle } = this;

    // the rings of the value axis: a polygon where the data is a polygon. The
    // outermost one gives way to the rim — the outline is that line's to draw,
    // and two strokes on one circle only fight each other
    if (rings.visible) {
      for (const tick of ticks) {
        if (tick.radius <= RING_EPSILON) continue;
        if (rim.visible && Math.abs(maxRadius - tick.radius) <= RING_EPSILON) continue;
        layer.append(this.ringNode(centerX, centerY, tick.radius, corners, rings));
      }
    }
    // a spoke per category — the web stays whole even where a label was dropped
    if (spokes.visible) {
      for (const category of categories) {
        const end = pointAt(centerX, centerY, angleScale.center(category), maxRadius);
        const spoke = new Line();
        spoke.x1 = centerX;
        spoke.y1 = centerY;
        spoke.x2 = end.x;
        spoke.y2 = end.y;
        spoke.stroke = spokes.stroke;
        spoke.strokeWidth = spokes.width;
        if (spokes.lineDash) spoke.lineDash = spokes.lineDash;
        spoke.opacity = spokes.opacity;
        layer.append(spoke);
      }
    }
    // the rim closes the category axis, the vertical stands for the value one
    if (rim.visible) {
      layer.append(this.ringNode(centerX, centerY, maxRadius, corners, { ...rim, opacity: 1 }));
    }
    if (valueLine.visible) layer.append(verticalAxisLine(centerX, centerY, maxRadius, valueLine));

    const categoryFont = axisFont(categoryStyle);
    const rimBounds = categoryStyle.visible
      ? rimLabels.map((rimLabel) => {
          const placed = placeRimLabel(centerX, centerY, maxRadius + RIM_LABEL_GAP, rimLabel.angle);
          const label = new Text();
          label.text = rimLabel.text;
          label.x = placed.x;
          label.y = placed.y;
          label.fontSize = categoryStyle.size;
          label.fontFamily = categoryStyle.family;
          label.fontWeight = categoryStyle.weight;
          label.fill = categoryStyle.color;
          label.textAlign = placed.align;
          label.textBaseline = placed.baseline;
          labelLayer.append(label);
          return textBounds(
            placed.x,
            placed.y,
            measureText(rimLabel.text, categoryFont),
            categoryStyle.size,
            placed.align,
            placed.baseline,
          );
        })
      : [];

    if (!valueStyle.visible) return;
    // ring values climb the vertical at twelve o'clock, where the category
    // label of the first spoke already is: the outermost one gives way to it.
    // The run starts at the centre — where the scale begins, whether that is
    // zero or a floor the options set — so the web has a value to be read from
    const ringFont = axisFont(valueStyle);
    const ringLabels = ticks.map((tick, index) => {
      const text = axisLabelText(tick.value, index, axes?.radius?.label);
      const x = centerX + RING_LABEL_GAP;
      const y = centerY - tick.radius - RING_LABEL_LIFT;
      return { text, x, y, bounds: textBounds(x, y, measureText(text, ringFont), valueStyle.size, 'left', 'alphabetic') };
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
      label.fontSize = valueStyle.size;
      label.fontFamily = valueStyle.family;
      label.fontWeight = valueStyle.weight;
      label.fill = valueStyle.color;
      labelLayer.append(label);
    }
  }

  /** How many rings the value axis is read off. */
  private get ringCount(): number {
    return Math.max(1, Math.round(this.inputs.axes?.radius?.ringCount ?? DEFAULT_RING_COUNT));
  }

  /**
   * One ring of the web: a polygon through `corners` — the spoke angles — where
   * the data is a polygon, a circle where it is not.
   */
  private ringNode(centerX: number, centerY: number, radius: number, corners: number[] | undefined, style: ResolvedGridLine): Path | Circle {
    const node = corners ? new Path() : new Circle();
    if (node instanceof Path) {
      corners?.forEach((angle, index) => {
        const point = pointAt(centerX, centerY, angle, radius);
        if (index === 0) node.moveTo(point.x, point.y);
        else node.lineTo(point.x, point.y);
      });
      node.closePath();
    } else {
      node.x = centerX;
      node.y = centerY;
      node.radius = radius;
    }
    node.stroke = style.stroke;
    node.strokeWidth = style.width;
    if (style.lineDash) node.lineDash = style.lineDash;
    node.opacity = style.opacity;
    return node;
  }

  /**
   * The titles of the axes: the categories are named under the chart, the
   * values along its left edge, turned to read upwards.
   */
  private renderAxisTitles(layer: Group, area: LayoutRect, angle: ResolvedAxisText, radius: ResolvedAxisText): void {
    if (angle.visible) {
      const title = new Text();
      title.text = this.inputs.axes?.angle?.title?.text ?? '';
      title.x = area.x + area.width / 2;
      title.y = area.y + area.height;
      title.textAlign = 'center';
      title.textBaseline = 'bottom';
      title.fontSize = angle.size;
      title.fontFamily = angle.family;
      title.fontWeight = angle.weight;
      title.fill = angle.color;
      layer.append(title);
    }
    if (radius.visible) {
      const title = new Text();
      title.text = this.inputs.axes?.radius?.title?.text ?? '';
      title.x = area.x;
      title.y = area.y + area.height / 2;
      title.textAlign = 'center';
      title.textBaseline = 'top';
      title.rotation = -90;
      title.fontSize = radius.size;
      title.fontFamily = radius.family;
      title.fontWeight = radius.weight;
      title.fill = radius.color;
      layer.append(title);
    }
  }

  /** Inverted layout grid (radial-bar): category rings + value spokes. */
  private renderInverseGrid(
    layer: Group,
    labelLayer: Group,
    centerX: number,
    centerY: number,
    radiusBandScale: BandScale<unknown>,
    angleValueScale: LinearScale,
    measureText: MeasureText,
  ): void {
    const axes = this.inputs.axes;
    const categories = radiusBandScale.domain;
    // the inverted layout swaps what the two axes draw: the categories are the
    // rings, the values are the spokes — the options follow the meaning, not the shape
    const categoryRings = resolveGridLine(axes?.angle?.gridLine, this.theme, INVERSE_GRID_OPACITY);
    const valueSpokes = resolveGridLine(axes?.radius?.gridLine, this.theme, INVERSE_GRID_OPACITY);
    const rim = resolveAxisLine(axes?.angle?.line, this.theme);
    const valueLine = resolveAxisLine(axes?.radius?.line, this.theme, this.theme.axis.line);
    const { categoryStyle, valueStyle } = this;
    if (categoryRings.visible) {
      for (const category of categories) {
        const ring = new Circle();
        ring.x = centerX;
        ring.y = centerY;
        ring.radius = radiusBandScale.center(category);
        ring.stroke = categoryRings.stroke;
        ring.strokeWidth = categoryRings.width;
        if (categoryRings.lineDash) ring.lineDash = categoryRings.lineDash;
        ring.opacity = categoryRings.opacity;
        layer.append(ring);
      }
    }

    // names stack up the left side, a ring apart; close rings share a row, so
    // the ones that would collide are dropped — this run does not wrap around
    const categoryFont = axisFont(categoryStyle);
    const names = categories.map((category, index) => axisLabelText(category, index, axes?.angle?.label));
    const nameBounds = categories.map((category, index) =>
      textBounds(
        centerX - INVERSE_LABEL_GAP,
        centerY - radiusBandScale.center(category),
        measureText(names[index] ?? '', categoryFont),
        categoryStyle.size,
        'right',
        'middle',
      ),
    );
    if (categoryStyle.visible) {
      for (const index of thinLabels(nameBounds)) {
        const category = categories[index];
        if (category === undefined) continue;
        const label = new Text();
        label.text = names[index] ?? '';
        label.x = centerX - INVERSE_LABEL_GAP;
        label.y = centerY - radiusBandScale.center(category);
        label.textAlign = 'right';
        label.textBaseline = 'middle';
        label.fontSize = categoryStyle.size;
        label.fontFamily = categoryStyle.family;
        label.fontWeight = categoryStyle.weight;
        label.fill = categoryStyle.color;
        labelLayer.append(label);
      }
    }
    const maxRadius = radiusBandScale.range[1];
    // the vertical is the zero the bars grow from — the value axis' own line,
    // there by default. The rim is asked for: the bars sweep part of the circle,
    // so a ring all the way round is a decision rather than a default
    if (rim.visible) {
      layer.append(this.ringNode(centerX, centerY, maxRadius, undefined, { ...rim, opacity: 1 }));
    }
    if (valueLine.visible) layer.append(verticalAxisLine(centerX, centerY, maxRadius, valueLine));
    angleValueScale.ticks(this.ringCount).forEach((tick, index) => {
      const angle = angleValueScale.convert(tick);
      const end = { x: centerX + Math.sin(angle) * maxRadius, y: centerY - Math.cos(angle) * maxRadius };
      // the spoke of the first tick is the line the bars start on: the value
      // axis draws it, or nothing does — the grid keeps off it
      if (valueSpokes.visible && tick > 0) {
        const spoke = new Line();
        spoke.x1 = centerX;
        spoke.y1 = centerY;
        spoke.x2 = end.x;
        spoke.y2 = end.y;
        spoke.stroke = valueSpokes.stroke;
        spoke.strokeWidth = valueSpokes.width;
        if (valueSpokes.lineDash) spoke.lineDash = valueSpokes.lineDash;
        spoke.opacity = valueSpokes.opacity;
        layer.append(spoke);
      }
      if (!valueStyle.visible) return;
      const at = placeRimLabel(centerX, centerY, maxRadius + RIM_LABEL_GAP, angle);
      const label = new Text();
      label.text = axisLabelText(tick, index, axes?.radius?.label);
      label.x = at.x;
      label.y = at.y;
      label.textAlign = 'center';
      label.textBaseline = 'middle';
      label.fontSize = valueStyle.size;
      label.fontFamily = valueStyle.family;
      label.fontWeight = valueStyle.weight;
      label.fill = valueStyle.color;
      labelLayer.append(label);
    });
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
    // shared: the category under the cursor is picked out in every series, and
    // none of them is dimmed — the tooltip speaks for all of them at once
    const next: HighlightState | undefined = pick
      ? { seriesId: pick.seriesId, datumIndex: pick.datumIndex, allSeries: this.sharedTooltip || undefined }
      : undefined;
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
      const content = this.tooltipContent(pick);
      if (content) this.tooltip.show(content, ...this.tooltipAnchor(pick, x, y), this.theme, this.inputs.tooltip);
    } else {
      this.tooltip?.hide();
    }
  }

  /** Whether the tooltip speaks for every series at once (tooltip.mode). */
  private get sharedTooltip(): boolean {
    return this.inputs.tooltip?.mode === 'shared';
  }

  /**
   * What the tooltip says about a pick: the series under the cursor on its own,
   * or — in shared mode — a row per visible series for the same category. A
   * radar carries a measure per series the way a line chart does, so the mode
   * means the same thing here.
   */
  private tooltipContent(pick: SeriesPick): TooltipContentData | undefined {
    if (!this.sharedTooltip) return this.series.find((instance) => instance.id === pick.seriesId)?.tooltipFor(pick.datumIndex);
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
    if (pick) this.emitNodeClick(pick.seriesId, pick.datumIndex);
    if (this.inputs.selection?.enabled) {
      if (pick) {
        this.toggleSelected(pick.seriesId, pick.datumIndex);
      } else {
        // a click on empty space drops the selection
        this.selectedMap.clear();
        this.afterSelectionChange();
      }
      return;
    }
    this.handleLegendClick(x, y);
  }

  // ------------------------------------------------------- imperative control

  showTooltip(target: NodeRef): boolean {
    const found = this.resolveNode(target);
    if (!found) return false;
    const { pick } = found;
    const previous = this.highlight;
    this.highlight = { seriesId: pick.seriesId, datumIndex: pick.datumIndex, allSeries: this.sharedTooltip || undefined };
    if (previous) {
      this.layoutAndRender();
      this.requestRender();
    } else {
      this.animateHover(1);
    }
    const content = this.tooltipContent(pick);
    if (content && this.tooltip && this.inputs.tooltip?.enabled !== false) {
      // no pointer to fall back on: the node's own anchor stands in for one
      this.tooltip.show(content, ...this.tooltipAnchor(pick, pick.x, pick.y), this.theme, this.inputs.tooltip);
    }
    return true;
  }

  hideTooltip(): void {
    this.handlePointerLeave();
  }

  clickNode(target: NodeRef, options?: ImperativeOptions): boolean {
    const found = this.resolveNode(target);
    if (!found) return false;
    const { pick } = found;
    if (!options?.silent) this.emitNodeClick(pick.seriesId, pick.datumIndex);
    if (this.inputs.selection?.enabled) this.toggleSelected(pick.seriesId, pick.datumIndex, options);
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

  /** The node a reference points at; without a series id the visible ones answer in order. */
  private resolveNode(target: NodeRef): { series: PolarSeriesInstance; pick: SeriesPick } | undefined {
    for (const series of this.series) {
      if (!series.visible) continue;
      if (target.seriesId !== undefined && series.id !== target.seriesId) continue;
      const pick = series.nodeAt?.(target.datumIndex);
      if (pick) return { series, pick };
    }
    return undefined;
  }

  private emitNodeClick(seriesId: string, datumIndex: number): void {
    const listener = this.inputs.listeners?.nodeClick;
    if (!listener) return;
    const datum = (this.inputs.data ?? [])[datumIndex];
    if (datum) listener({ seriesId, datumIndex, datum });
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
    const data = this.inputs.data ?? [];
    const items: SelectedItem[] = [];
    for (const [seriesId, indices] of this.selectedMap) {
      for (const datumIndex of indices) {
        const datum = data[datumIndex];
        if (datum) items.push({ seriesId, datumIndex, datum });
      }
    }
    return items;
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
        const visible = item?.visible !== false;
        // the same set the series' own visibility lives in, so getState carries both
        if (visible) this.hiddenSeries.delete(seriesId);
        else this.hiddenSeries.add(seriesId);
        this.inputs.listeners?.legendItemClick?.({ seriesId, visible });
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
    return { hiddenSeries: [...this.hiddenSeries] };
  }

  setState(state: ChartState): void {
    if (state.hiddenSeries) {
      this.hiddenSeries.clear();
      for (const id of state.hiddenSeries) this.hiddenSeries.add(id);
      for (const series of this.series) this.applyHiddenState(series);
    }
  }

  /**
   * What the legend has switched off, applied to a series: the series itself,
   * and — for pie/donut, whose sectors are legend items of their own — those
   * sectors, held as `<seriesId>#<index>` in the same set.
   */
  private applyHiddenState(series: PolarSeriesInstance): void {
    series.visible = !this.hiddenSeries.has(series.id);
    if (!series.setHiddenItems) return;
    const prefix = `${series.id}#`;
    const items = new Set<number>();
    for (const id of this.hiddenSeries) {
      if (!id.startsWith(prefix)) continue;
      const index = Number(id.slice(prefix.length));
      if (Number.isInteger(index)) items.add(index);
    }
    series.setHiddenItems(items);
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

/**
 * The line of the value axis: the vertical at twelve o'clock, from the centre —
 * where the scale starts — out to the rim. The values are read up it in both
 * layouts, and in the inverted one the bars stand on it.
 */
function verticalAxisLine(centerX: number, centerY: number, maxRadius: number, style: ResolvedAxisLine): Line {
  const line = new Line();
  line.x1 = centerX;
  line.y1 = centerY;
  line.x2 = centerX;
  line.y2 = centerY - maxRadius;
  line.stroke = style.stroke;
  line.strokeWidth = style.width;
  if (style.lineDash) line.lineDash = style.lineDash;
  return line;
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
