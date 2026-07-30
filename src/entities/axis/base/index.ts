import type { AxisEnv, AxisPosition, CartesianAxisInstance, Insets, LayoutRect, MeasureText } from '@/shared/kernel';
import type { ColorValue, FontOptions, Pixels, Switchable } from '@/shared/options';
import { BandScale, type AnyScale } from '@/shared/scale';
import { Group, Line, Rect, Text } from '@/shared/scene';
import { formatValue, maxOverflow, overflowOutside, NO_OVERFLOW } from '@/shared/util';

export interface AxisLabelFormatterParams {
  value: unknown;
  index: number;
}

export type AxisLabelPlacement = 'outside' | 'inside';

export type AxisInsideLabelAlign = 'element' | 'gap';

export interface AxisCrossLineOptions {
  type?: 'line' | 'range';
  value?: unknown;
  range?: [unknown, unknown];
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  lineDash?: Pixels[];
  fill?: ColorValue;
  fillOpacity?: number;
  label?: { text?: string; color?: ColorValue; fontSize?: Pixels };
}

export interface AxisBaseOptions {
  position?: AxisPosition;
  title?: Switchable & FontOptions & { text?: string };
  line?: Switchable & { stroke?: ColorValue; width?: Pixels };
  tick?: Switchable & { size?: Pixels; width?: Pixels; stroke?: ColorValue };
  label?: Switchable &
    FontOptions & {
      /** Gap from the axis line (from the tick, when ticks are on). Outside labels only. */
      spacing?: Pixels;
      /**
       * 'outside' (default) — labels next to the axis line; 'inside' — inside
       * the plot area: on a vertical axis above the band (over the bar), on a
       * horizontal one along the inner edge. Inside labels reserve no space.
       */
      placement?: AxisLabelPlacement;
      /** Inside placement: indent from the axis into the plot area. */
      insideSpacing?: Pixels;
      /** Inside placement: gap to the element the label belongs to (and to the one before it). */
      insideGap?: Pixels;
      /**
       * Inside placement on a band axis: 'element' (default) — the label hugs its
       * own element, `insideGap` away from it; 'gap' — the label is centred in the
       * gap between elements.
       */
      insideAlign?: AxisInsideLabelAlign;
      /** Serializable format string (',.2f', '.0%', '%d %b'). */
      format?: string;
      formatter?: (params: AxisLabelFormatterParams) => string;
      /** Skip overlapping labels (true by default). */
      avoidCollisions?: boolean;
    };
  gridLine?: Switchable & { stroke?: ColorValue; width?: Pixels; lineDash?: Pixels[] };
  interval?: {
    /** Explicit tick values. */
    values?: unknown[];
    /** Minimum spacing between labels, px. */
    minSpacing?: Pixels;
  };
  crossLines?: AxisCrossLineOptions[];
}

const TICK_SIZE = 6;
const LABEL_SPACING = 8;
/** Inside labels keep their own distances: they sit in the plot, not beside it. */
const INSIDE_LABEL_SPACING = 4;
const INSIDE_LABEL_GAP = 4;
const TITLE_SPACING = 6;
const LABEL_FONT_SIZE = 11;
const TITLE_FONT_SIZE = 12;
const MIN_LABEL_SPACING = 8;
/** Grid lines are dashed by default — they read as a backdrop, not as data. */
const GRID_DASH: Pixels[] = [4, 4];
/** Bands never give up more than this share of the step to the gap between them. */
const MAX_PADDING_INNER = 0.8;
/** Band padding shared by the categorical axes. */
export const DEFAULT_PADDING_INNER = 0.2;
export const DEFAULT_PADDING_OUTER = 0.1;

export abstract class BaseAxis<O extends AxisBaseOptions = AxisBaseOptions> implements CartesianAxisInstance {
  abstract readonly type: string;
  abstract readonly scale: AnyScale;

  constructor(
    protected readonly options: O,
    protected readonly env: AxisEnv,
  ) {}

  get position(): AxisPosition {
    return this.env.position;
  }

  protected get isHorizontal(): boolean {
    return this.position === 'bottom' || this.position === 'top';
  }

  /** Labels drawn inside the plot area: they take no thickness from the plot rect. */
  protected get labelsInside(): boolean {
    const label = this.options.label;
    return label?.placement === 'inside' && label.enabled !== false;
  }

  /** Ticks are off by default: the labels alone read the scale well enough. */
  protected get ticksVisible(): boolean {
    return this.options.tick?.enabled === true;
  }

  /** Indent of an inside label from the axis into the plot area. */
  private get insideSpacing(): number {
    return this.options.label?.insideSpacing ?? INSIDE_LABEL_SPACING;
  }

  /** Gap an inside label keeps from its own element and from the one before it. */
  private get insideGap(): number {
    return this.options.label?.insideGap ?? INSIDE_LABEL_GAP;
  }

  /** Vertical space one inside label needs: the glyph row plus a gap on both sides. */
  protected insideLabelSlot(): number {
    return (this.options.label?.fontSize ?? LABEL_FONT_SIZE) + this.insideGap * 2;
  }

  /**
   * Binds a band scale to the plot rect and resolves the gap between bands:
   * `gapPx` wins over the `paddingInner` fraction, and an inside label row is
   * added on top of whichever was asked for — the requested gap keeps its meaning
   * either way. A row is also reserved above the first band.
   */
  protected layoutBandScale(scale: BandScale<unknown>, plot: LayoutRect, paddingInner: number, gapPx?: Pixels): void {
    // per-band label rows exist on a vertical axis only: a horizontal one runs its labels along the edge
    const slot = !this.isHorizontal && this.labelsInside ? this.insideLabelSlot() : 0;
    // categories read left to right and top to bottom
    const start = this.isHorizontal ? plot.x : Math.min(plot.y + slot, plot.y + plot.height);
    const end = this.isHorizontal ? plot.x + plot.width : plot.y + plot.height;
    scale.range = [start, end];

    const requested = Math.min(Math.max(paddingInner, 0), MAX_PADDING_INNER);
    scale.paddingInner = requested;
    const span = end - start;
    const count = scale.domain.length;
    if (count === 0 || span <= 0) return;
    // step · paddingInner = slot + gap, step = span / (count − paddingInner + 2 · paddingOuter)
    const step =
      gapPx !== undefined
        ? (span + slot + gapPx) / (count + 2 * scale.paddingOuter)
        : (span + slot) / (count - requested + 2 * scale.paddingOuter);
    if (step <= 0) return;
    const gap = gapPx !== undefined ? Math.max(gapPx, 0) : requested * step;
    scale.paddingInner = Math.min((slot + gap) / step, MAX_PADDING_INNER);
  }

  abstract setDomain(domain: unknown[]): void;
  abstract layout(plot: LayoutRect): void;
  /** Tick positions in pixels and their values. */
  protected abstract tickInfo(): Array<{ value: unknown; coord: number }>;

  protected formatTick(value: unknown, index: number): string {
    const formatter = this.options.label?.formatter;
    if (formatter) return formatter({ value, index });
    const format = this.options.label?.format;
    if (format) return formatValue(format, value);
    return typeof value === 'number' ? formatNumber(value) : String(value);
  }

  protected labelFont(): string {
    const label = this.options.label;
    return `${label?.fontWeight ?? 'normal'} ${label?.fontSize ?? LABEL_FONT_SIZE}px ${label?.fontFamily ?? this.env.theme.fontFamily}`;
  }

  /** Ticks accounting for interval.values and skipping of overlapping labels. */
  protected displayTicks(): Array<{ value: unknown; coord: number; index: number }> {
    const explicit = this.options.interval?.values;
    const raw = explicit
      ? explicit.map((value) => ({ value, coord: this.coordOf(value) })).filter(({ coord }) => !Number.isNaN(coord))
      : this.tickInfo();
    const ticks = raw.map((tick, index) => ({ ...tick, index }));
    if (this.options.label?.avoidCollisions === false) return ticks;
    // a vertical axis only crowds when its labels sit inside, in a row per band
    if (!this.isHorizontal) return this.labelsInside ? thin(ticks, this.insideLabelSlot()) : ticks;

    const font = this.labelFont();
    const minSpacing = this.options.interval?.minSpacing ?? MIN_LABEL_SPACING;
    let maxWidth = 0;
    for (const tick of ticks) {
      maxWidth = Math.max(maxWidth, this.measureWithCanvasFallback(this.formatTick(tick.value, tick.index), font));
    }
    return thin(ticks, maxWidth + minSpacing);
  }

  /** Coordinate of a value on the scale (for interval.values and crossLines). */
  protected coordOf(value: unknown): number {
    const scale = this.scale as { center?: (v: unknown) => number; convert: (v: never) => number };
    if (typeof scale.center === 'function') return scale.center(value);
    return (this.scale as { convert: (v: number) => number }).convert(Number(value));
  }

  measure(measureText: MeasureText): number {
    let thickness = 0;
    const tick = this.options.tick;
    if (this.ticksVisible) thickness += tick?.size ?? TICK_SIZE;

    const label = this.options.label;
    if (label?.enabled !== false && !this.labelsInside) {
      const fontSize = label?.fontSize ?? LABEL_FONT_SIZE;
      thickness += label?.spacing ?? LABEL_SPACING;
      if (this.isHorizontal) {
        thickness += fontSize;
      } else {
        const font = this.labelFont();
        const widths = this.displayTicks().map(({ value, index }) => measureText(this.formatTick(value, index), font));
        thickness += widths.length > 0 ? Math.max(...widths) : 0;
      }
    }

    const title = this.options.title;
    if (title?.text && title.enabled !== false) {
      thickness += (title.fontSize ?? TITLE_FONT_SIZE) + TITLE_SPACING;
    }
    return Math.ceil(thickness);
  }

  /**
   * A tick label is centred on its tick, so the outermost ones hang over the
   * ends of the plot rect — by half their width on a horizontal axis, by half
   * a line on a vertical one. That is the room the layout has to find for them.
   */
  labelOverflow(measureText: MeasureText, plot: LayoutRect): Insets {
    if (this.options.label?.enabled === false || this.labelsInside) return NO_OVERFLOW;
    const font = this.labelFont();
    const fontSize = this.options.label?.fontSize ?? LABEL_FONT_SIZE;
    let overflow = NO_OVERFLOW;
    for (const { value, coord, index } of this.displayTicks()) {
      const half = this.isHorizontal ? measureText(this.formatTick(value, index), font) / 2 : fontSize / 2;
      // across the axis the labels stay in the zone measure() reserved — only the ends matter here
      const bounds = this.isHorizontal
        ? { left: coord - half, right: coord + half, top: plot.y, bottom: plot.y + plot.height }
        : { left: plot.x, right: plot.x + plot.width, top: coord - half, bottom: coord + half };
      overflow = maxOverflow(overflow, overflowOutside(bounds, plot));
    }
    return overflow;
  }

  render(axisLayer: Group, gridLayer: Group, plot: LayoutRect, foregroundLayer?: Group): void {
    const theme = this.env.theme;
    const ticks = this.displayTicks();
    const edge = this.edgeCoordinate(plot);

    const lineOptions = this.options.line;
    if (lineOptions?.enabled !== false) {
      const axisLine = new Line();
      if (this.isHorizontal) {
        axisLine.x1 = plot.x;
        axisLine.x2 = plot.x + plot.width;
        axisLine.y1 = axisLine.y2 = edge;
      } else {
        axisLine.y1 = plot.y;
        axisLine.y2 = plot.y + plot.height;
        axisLine.x1 = axisLine.x2 = edge;
      }
      axisLine.stroke = lineOptions?.stroke ?? theme.axisColor;
      axisLine.strokeWidth = lineOptions?.width ?? 1;
      axisLayer.append(axisLine);
    }

    const gridOptions = this.options.gridLine;
    if (gridOptions?.enabled !== false) {
      for (const { coord } of ticks) {
        const grid = new Line();
        if (this.isHorizontal) {
          grid.x1 = grid.x2 = coord;
          grid.y1 = plot.y;
          grid.y2 = plot.y + plot.height;
        } else {
          grid.y1 = grid.y2 = coord;
          grid.x1 = plot.x;
          grid.x2 = plot.x + plot.width;
        }
        grid.stroke = gridOptions?.stroke ?? theme.axisColor;
        grid.strokeWidth = gridOptions?.width ?? 1;
        grid.lineDash = gridOptions?.lineDash ?? GRID_DASH;
        gridLayer.append(grid);
      }
    }

    this.renderCrossLines(gridLayer, plot);

    const tickOptions = this.options.tick;
    const tickSize = tickOptions?.size ?? TICK_SIZE;
    const direction = this.outwardSign();
    if (this.ticksVisible) {
      for (const { coord } of ticks) {
        const tick = new Line();
        if (this.isHorizontal) {
          tick.x1 = tick.x2 = coord;
          tick.y1 = edge;
          tick.y2 = edge + tickSize * direction;
        } else {
          tick.y1 = tick.y2 = coord;
          tick.x1 = edge;
          tick.x2 = edge + tickSize * direction;
        }
        tick.stroke = tickOptions?.stroke ?? theme.axisColor;
        tick.strokeWidth = tickOptions?.width ?? 1;
        axisLayer.append(tick);
      }
    }

    const labelOptions = this.options.label;
    let labelExtent = this.ticksVisible ? tickSize : 0;
    const insideLabels = this.labelsInside;
    if (labelOptions?.enabled !== false && insideLabels) {
      // above the series: bars would otherwise cover the labels
      this.renderInsideLabels(foregroundLayer ?? axisLayer, plot, ticks);
    } else if (labelOptions?.enabled !== false) {
      labelExtent += labelOptions?.spacing ?? LABEL_SPACING;
      const fontSize = labelOptions?.fontSize ?? LABEL_FONT_SIZE;
      let maxLabelSize = 0;
      for (const { value, coord, index } of ticks) {
        const text = this.labelNode(this.formatTick(value, index));
        if (this.isHorizontal) {
          text.x = coord;
          text.y = edge + labelExtent * direction;
          text.textAlign = 'center';
          text.textBaseline = this.position === 'bottom' ? 'top' : 'bottom';
          maxLabelSize = Math.max(maxLabelSize, fontSize);
        } else {
          text.x = edge + labelExtent * direction;
          text.y = coord;
          text.textAlign = this.position === 'left' ? 'right' : 'left';
          text.textBaseline = 'middle';
        }
        axisLayer.append(text);
      }
      if (this.isHorizontal) {
        labelExtent += maxLabelSize;
      }
    }

    const title = this.options.title;
    if (title?.text && title.enabled !== false) {
      if (!this.isHorizontal && !insideLabels) {
        const font = this.labelFont();
        const widths = ticks.map(({ value, index }) => this.measureWithCanvasFallback(this.formatTick(value, index), font));
        labelExtent += widths.length > 0 ? Math.max(...widths) : 0;
      }
      const node = new Text();
      node.text = title.text;
      node.fontSize = title.fontSize ?? TITLE_FONT_SIZE;
      node.fontWeight = title.fontWeight !== undefined ? String(title.fontWeight) : 'bold';
      node.fontFamily = title.fontFamily ?? theme.fontFamily;
      node.fill = title.color ?? theme.foregroundColor;
      node.textAlign = 'center';
      const offset = labelExtent + TITLE_SPACING;
      if (this.isHorizontal) {
        node.x = plot.x + plot.width / 2;
        node.y = edge + offset * direction;
        node.textBaseline = this.position === 'bottom' ? 'top' : 'bottom';
      } else {
        node.x = edge + offset * direction;
        node.y = plot.y + plot.height / 2;
        node.textBaseline = this.position === 'left' ? 'bottom' : 'top';
        node.rotation = -90;
      }
      axisLayer.append(node);
    }
  }

  /** Tick label with the label font applied; positioning is up to the caller. */
  private labelNode(content: string): Text {
    const label = this.options.label;
    const node = new Text();
    node.text = content;
    node.fontSize = label?.fontSize ?? LABEL_FONT_SIZE;
    node.fontFamily = label?.fontFamily ?? this.env.theme.fontFamily;
    if (label?.fontWeight !== undefined) node.fontWeight = String(label.fontWeight);
    node.fill = label?.color ?? this.env.theme.mutedColor;
    return node;
  }

  /**
   * Labels inside the plot area: on a vertical axis above the band (over the bar,
   * flush with the start of the value axis), on a horizontal one along the inner
   * edge of the plot rect. Continuous scales fall back to the tick coordinate.
   */
  private renderInsideLabels(layer: Group, plot: LayoutRect, ticks: Array<{ value: unknown; coord: number; index: number }>): void {
    const spacing = this.insideSpacing;
    for (const { value, coord, index } of ticks) {
      const node = this.labelNode(this.formatTick(value, index));
      if (this.isHorizontal) {
        // along the axis: only the indent from it, the label is centred on the band
        node.x = coord;
        node.textAlign = 'center';
        node.y = this.position === 'bottom' ? plot.y + plot.height - spacing : plot.y + spacing;
        node.textBaseline = this.position === 'bottom' ? 'bottom' : 'top';
      } else {
        // across the axis: hugging the band or centred in the gap; along it: the indent from the axis
        const start = this.bandStart(value) ?? coord;
        const gap = this.bandGap();
        if (this.options.label?.insideAlign === 'gap' && gap !== undefined) {
          node.y = start - gap / 2;
          node.textBaseline = 'middle';
        } else {
          node.y = start - this.insideGap;
          node.textBaseline = 'bottom';
        }
        node.x = this.position === 'left' ? plot.x + spacing : plot.x + plot.width - spacing;
        node.textAlign = this.position === 'left' ? 'left' : 'right';
      }
      layer.append(node);
    }
  }

  /** Gap between two bands in px; undefined on a continuous scale. */
  private bandGap(): number | undefined {
    if (!(this.scale instanceof BandScale)) return undefined;
    return this.scale.stepSize - this.scale.bandwidth;
  }

  /** Top (or left) edge of the band for a value; undefined on a continuous scale. */
  private bandStart(value: unknown): number | undefined {
    if (!(this.scale instanceof BandScale)) return undefined;
    const start = this.scale.convert(value);
    return Number.isNaN(start) ? undefined : start;
  }

  private renderCrossLines(gridLayer: Group, plot: LayoutRect): void {
    const crossLines = this.options.crossLines;
    if (!crossLines?.length) return;
    const theme = this.env.theme;
    for (const crossLine of crossLines) {
      const isRange = crossLine.type === 'range' || crossLine.range !== undefined;
      if (isRange && crossLine.range) {
        const [from, to] = crossLine.range;
        const c0 = this.coordOf(from);
        const c1 = this.coordOf(to);
        if (Number.isNaN(c0) || Number.isNaN(c1)) continue;
        const rect = new Rect();
        if (this.isHorizontal) {
          rect.x = Math.min(c0, c1);
          rect.width = Math.abs(c1 - c0);
          rect.y = plot.y;
          rect.height = plot.height;
        } else {
          rect.y = Math.min(c0, c1);
          rect.height = Math.abs(c1 - c0);
          rect.x = plot.x;
          rect.width = plot.width;
        }
        rect.fill = crossLine.fill ?? theme.mutedColor;
        rect.opacity = crossLine.fillOpacity ?? 0.12;
        gridLayer.append(rect);
        this.appendCrossLineLabel(gridLayer, crossLine, (c0 + c1) / 2, plot);
      } else if (crossLine.value !== undefined) {
        const coord = this.coordOf(crossLine.value);
        if (Number.isNaN(coord)) continue;
        const line = new Line();
        if (this.isHorizontal) {
          line.x1 = line.x2 = coord;
          line.y1 = plot.y;
          line.y2 = plot.y + plot.height;
        } else {
          line.y1 = line.y2 = coord;
          line.x1 = plot.x;
          line.x2 = plot.x + plot.width;
        }
        line.stroke = crossLine.stroke ?? theme.foregroundColor;
        line.strokeWidth = crossLine.strokeWidth ?? 1;
        line.lineDash = crossLine.lineDash ?? [4, 3];
        gridLayer.append(line);
        this.appendCrossLineLabel(gridLayer, crossLine, coord, plot);
      }
    }
  }

  private appendCrossLineLabel(layer: Group, crossLine: AxisCrossLineOptions, coord: number, plot: LayoutRect): void {
    const text = crossLine.label?.text;
    if (!text) return;
    const node = new Text();
    node.text = text;
    node.fontSize = crossLine.label?.fontSize ?? 11;
    node.fontFamily = this.env.theme.fontFamily;
    node.fill = crossLine.label?.color ?? crossLine.stroke ?? this.env.theme.foregroundColor;
    if (this.isHorizontal) {
      node.x = coord;
      node.y = plot.y + 4;
      node.textAlign = 'center';
      node.textBaseline = 'top';
    } else {
      node.x = plot.x + plot.width - 4;
      node.y = coord - 4;
      node.textAlign = 'right';
      node.textBaseline = 'bottom';
    }
    layer.append(node);
  }

  private measureCtx: CanvasRenderingContext2D | undefined;

  /** Rough text measurement without a layout context. */
  protected measureWithCanvasFallback(text: string, font: string): number {
    if (typeof document !== 'undefined') {
      this.measureCtx ??= document.createElement('canvas').getContext('2d') ?? undefined;
      if (this.measureCtx) {
        this.measureCtx.font = font;
        return this.measureCtx.measureText(text).width;
      }
    }
    const fontSize = Number.parseFloat(font) || LABEL_FONT_SIZE;
    return text.length * fontSize * 0.6;
  }

  /** Coordinate of the axis line (the plot rect edge on the position side). */
  private edgeCoordinate(plot: LayoutRect): number {
    switch (this.position) {
      case 'bottom':
        return plot.y + plot.height;
      case 'top':
        return plot.y;
      case 'left':
        return plot.x;
      case 'right':
        return plot.x + plot.width;
    }
  }

  /** Outward direction from the plot rect: +1 down/right, −1 up/left. */
  private outwardSign(): 1 | -1 {
    return this.position === 'bottom' || this.position === 'right' ? 1 : -1;
  }
}

/**
 * Keeps every k-th tick, where k is how many steps one label needs: the labels
 * thin out instead of piling up on each other.
 */
function thin<T extends { coord: number }>(ticks: T[], labelExtent: number): T[] {
  const first = ticks[0];
  const second = ticks[1];
  if (!first || !second) return ticks;
  const stepPx = Math.abs(second.coord - first.coord);
  if (stepPx <= 0) return ticks;
  const stride = Math.max(1, Math.ceil(labelExtent / stepPx));
  return stride === 1 ? ticks : ticks.filter((_, index) => index % stride === 0);
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1e6) return `${value / 1e6}M`;
  if (Math.abs(value) >= 1e4) return `${value / 1e3}k`;
  return String(Number(value.toFixed(10)));
}
