import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { AxisPosition, LegendItemDescriptor, LayoutRect, ThemeContext } from '@/shared/kernel';
import {
  resolvePadding,
  type ColorValue,
  type Fraction,
  type FontOptions,
  type FontWeight,
  type Padding,
  type PaddingValue,
  type Pixels,
  type ShadowOptions,
  type Switchable,
} from '@/shared/options';
import { Group, Line, Marker, Rect, resolveShadow, Text, type MarkerShape } from '@/shared/scene';

export type LegendPlacement =
  | AxisPosition
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'left-top'
  | 'left-bottom'
  | 'right-top'
  | 'right-bottom';

export interface LegendBackgroundOptions {
  fill?: ColorValue;
  stroke?: ColorValue;
  /** 1 by default when `stroke` is set. */
  strokeWidth?: Pixels;
  /** 4 by default. */
  cornerRadius?: Pixels;
  /**
   * Inner padding in any CSS-like shorthand — `8`, `[8, 12]`,
   * `[8, 12, 4, 0]` or `{ top, right, bottom, left }`.
   * 8 by default when fill/stroke is set, otherwise 0.
   */
  padding?: PaddingValue;
  /** Drop shadow under the panel; drawn only when the panel has a fill. */
  shadow?: ShadowOptions;
}

/** Legend marker glyph: any point-series shape plus 'line' — a dash, as line/area series draw. */
export type LegendMarkerShape = MarkerShape | 'line';

export interface LegendMarkerOptions {
  /** 'square' by default (a rounded square); 'line' draws a dash. */
  shape?: LegendMarkerShape;
  /**
   * Custom glyph as SVG path data — wins over `shape`. Coordinates are taken in a
   * `viewBox` square and scaled to the marker size, so the same `d` fits any size.
   */
  path?: string;
  /** Side of the square the `path` coordinates live in; 24 by default. */
  viewBox?: number;
  /** Marker box side; 10 by default (a 'line' marker is drawn 1.8× wider). */
  size?: Pixels;
  /** Outline colour; without it the glyph is filled only. */
  stroke?: ColorValue;
  /** Outline width, and the thickness of a 'line' marker; 1 / theme width by default. */
  strokeWidth?: Pixels;
  /** Dashes for a 'line' marker. */
  lineDash?: Pixels[];
  /** 'square' only: corner rounding; 3 by default. */
  cornerRadius?: Pixels;
}

export interface LegendItemMarkerOptions extends LegendMarkerOptions {
  /** Glyph colour; a bound item inherits the series colour. */
  color?: ColorValue;
}

export interface LegendItemOptions {
  /** Display text of the item. */
  name: string;
  /**
   * Binds the item to a series: matched against the series id first, then its name
   * (for pie-like series — the sector label). A bound item toggles the series on click
   * and dims when it is hidden; an unbound item is static.
   */
  series?: string;
  /** Per-item marker; falls back to `legend.item.marker` field by field. */
  marker?: LegendItemMarkerOptions;
  /** Per-item label font; falls back to `item.label`, then the theme. */
  label?: FontOptions;
  /** Value to the right of the label ("label … value"). */
  value?: string;
}

export interface LegendItemStyleOptions {
  /** Marker glyph shared by all items. */
  marker?: LegendMarkerOptions;
  label?: FontOptions;
  /** Font of the value text; falls back to the label font at the theme's muted colour. */
  value?: FontOptions;
  /** Gap between the marker and the label; 6 by default. */
  markerGap?: Pixels;
  /** Gap between the label and the value; 14 by default. */
  valueGap?: Pixels;
  /** Gap between neighbouring items in a row; 18 by default. */
  gap?: Pixels;
  /** Gap between rows; 8 by default. */
  rowGap?: Pixels;
  /** Opacity of an item whose series is hidden; 0.4 by default. */
  hiddenOpacity?: Fraction;
}

export interface LegendOptions extends Switchable {
  /**
   * The docking side (first token) plus an optional alignment along it:
   * 'top-right' docks to the top edge, right-aligned ('top' centers).
   * With `floating: true` the same value anchors the legend over the chart.
   */
  position?: LegendPlacement;
  /** Overlay the whole chart area (CSS position:absolute style) instead of reserving space. */
  floating?: boolean;
  /** Floating only: inset from the anchored edges; along a centered axis — a shift right/down. */
  offset?: { x?: Pixels; y?: Pixels };
  /**
   * Floating only: make the title and subtitle flow around the legend box instead of
   * running underneath it (true by default). Set to false to allow the overlap.
   */
  avoidCaptions?: boolean;
  /** Panel behind the items. */
  background?: LegendBackgroundOptions;
  /** Clicking an item toggles series visibility (true by default). */
  toggleSeries?: boolean;
  /** Styling shared by all items. */
  item?: LegendItemStyleOptions;
  /** Rows per page for a horizontal legend; 2 by default. A vertical one pages by height. */
  maxRows?: number;
  /** Renders the items back to front. */
  reverse?: boolean;
  /** Custom items; fully replaces the auto-derived series items. */
  data?: LegendItemOptions[];
}

const MARKER_SIZE = 10;
const MARKER_CORNER_RADIUS = 3;
/** A dash reads as a line only when it is noticeably wider than it is tall. */
const LINE_MARKER_RATIO = 1.8;
const MARKER_GAP = 6;
const ITEM_GAP_X = 18;
const VALUE_GAP = 14;
const ITEM_GAP_Y = 8;
const DISABLED_OPACITY = 0.4;

/** A legend entry ready for layout: a series descriptor as-is, or a resolved custom `data` entry. */
export interface ResolvedLegendItem {
  label: string;
  visible: boolean;
  /** Present only when the item is bound to a series — makes the item interactive. */
  seriesId?: string;
  color?: ColorValue;
  value?: string;
  /** Per-item marker overrides on top of `legend.item.marker`. */
  marker?: LegendItemMarkerOptions;
  labelFont?: FontOptions;
}

export function resolveLegendItems(
  data: LegendItemOptions[] | undefined,
  descriptors: LegendItemDescriptor[],
  onUnresolved?: (ref: string) => void,
): ResolvedLegendItem[] {
  if (!data) return descriptors.map(({ seriesId, label, color, visible, value }) => ({ seriesId, label, color, visible, value }));
  return data.map((entry) => {
    const target =
      entry.series === undefined
        ? undefined
        : (descriptors.find((descriptor) => descriptor.seriesId === entry.series) ??
          descriptors.find((descriptor) => descriptor.label === entry.series));
    if (entry.series !== undefined && !target) onUnresolved?.(entry.series);
    return {
      label: entry.name,
      visible: target?.visible ?? true,
      seriesId: target?.seriesId,
      color: entry.marker?.color ?? target?.color,
      value: entry.value,
      marker: entry.marker,
      labelFont: entry.label,
    };
  });
}

/**
 * Origin of a floating legend box within `rect`. The offset insets the box
 * from the anchored edges; along a centered axis it shifts right/down.
 */
export function placeLegendBox(
  placement: LegendPlacement,
  size: { width: Pixels; height: Pixels },
  rect: LayoutRect,
  offset?: { x?: Pixels; y?: Pixels },
): { x: number; y: number } {
  const parts = placement.split('-');
  const dx = offset?.x ?? 0;
  const dy = offset?.y ?? 0;
  let x: number;
  if (parts.includes('left')) x = rect.x + dx;
  else if (parts.includes('right')) x = rect.x + rect.width - size.width - dx;
  else x = rect.x + (rect.width - size.width) / 2 + dx;
  let y: number;
  if (parts.includes('top')) y = rect.y + dy;
  else if (parts.includes('bottom')) y = rect.y + rect.height - size.height - dy;
  else y = rect.y + (rect.height - size.height) / 2 + dy;
  return { x, y };
}

interface PlacedItem {
  item: ResolvedLegendItem;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const LEGEND_PAGER_PREV = '__legend_prev';
export const LEGEND_PAGER_NEXT = '__legend_next';
const PAGER_HEIGHT = 16;
const MAX_ROWS = 2;

export class Legend {
  private placed: PlacedItem[] = [];
  private items: LegendItemDescriptor[] = [];
  private size = { width: 0, height: 0 };
  private page = 0;
  private pages = 1;
  private pagerHits: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
  private warnedUnresolved = false;
  /** Width the captions left the legend, when they had to take some of it back. */
  private widthCap: number | undefined;

  constructor(
    private readonly options: LegendOptions | undefined,
    private readonly theme: ThemeContext,
  ) {}

  get enabled(): boolean {
    return this.options?.enabled !== false;
  }

  /** Docking side / layout orientation — the first token of the placement. */
  get position(): AxisPosition {
    const [edge] = (this.options?.position ?? 'bottom').split('-');
    return (edge ?? 'bottom') as AxisPosition;
  }

  get floating(): boolean {
    return this.options?.floating === true;
  }

  get toggleSeries(): boolean {
    return this.options?.toggleSeries !== false;
  }

  setItems(items: LegendItemDescriptor[]): void {
    this.items = items;
    // a cap belongs to one layout of one set of items, never to the next
    this.widthCap = undefined;
  }

  /**
   * Caps the width the legend may take, whatever room it is measured within.
   * A floating legend that leaves the captions no column of their own is asked
   * to fit into less and wrap onto more rows instead.
   */
  limitWidth(px: number | undefined): void {
    this.widthCap = px !== undefined ? Math.max(0, px) : undefined;
  }

  private get fontSize(): number {
    return this.options?.item?.label?.fontSize ?? themeFont(this.theme, FONT_STEP.heading);
  }

  private get markerSize(): number {
    return this.options?.item?.marker?.size ?? MARKER_SIZE;
  }

  /** Per-item marker options resolved field by field against `legend.item.marker`. */
  private markerOf(item: ResolvedLegendItem): LegendItemMarkerOptions {
    const shared = this.options?.item?.marker;
    const own = item.marker;
    return {
      shape: own?.shape ?? shared?.shape ?? 'square',
      path: own?.path ?? shared?.path,
      viewBox: own?.viewBox ?? shared?.viewBox,
      size: own?.size ?? shared?.size ?? MARKER_SIZE,
      color: own?.color ?? item.color ?? this.theme.mutedColor,
      stroke: own?.stroke ?? shared?.stroke,
      strokeWidth: own?.strokeWidth ?? shared?.strokeWidth,
      lineDash: own?.lineDash ?? shared?.lineDash,
      cornerRadius: own?.cornerRadius ?? shared?.cornerRadius ?? MARKER_CORNER_RADIUS,
    };
  }

  private get markerGap(): number {
    return this.options?.item?.markerGap ?? MARKER_GAP;
  }

  private get valueGap(): number {
    return this.options?.item?.valueGap ?? VALUE_GAP;
  }

  private get itemGap(): number {
    return this.options?.item?.gap ?? ITEM_GAP_X;
  }

  private get rowGap(): number {
    return this.options?.item?.rowGap ?? ITEM_GAP_Y;
  }

  private get padding(): Required<Padding> {
    const background = this.options?.background;
    const panelled = background?.fill !== undefined || background?.stroke !== undefined;
    return resolvePadding(background?.padding ?? (panelled ? 8 : 0));
  }

  private itemMarkerSize(item: ResolvedLegendItem): number {
    return item.marker?.size ?? this.markerSize;
  }

  /** Horizontal slot the glyph takes: a dash is wider than the square box. */
  private itemMarkerWidth(item: ResolvedLegendItem): number {
    const size = this.itemMarkerSize(item);
    return this.markerOf(item).shape === 'line' ? size * LINE_MARKER_RATIO : size;
  }

  private itemFontSize(item: ResolvedLegendItem): number {
    return item.labelFont?.fontSize ?? this.fontSize;
  }

  private itemFontWeight(item: ResolvedLegendItem): FontWeight {
    return item.labelFont?.fontWeight ?? this.options?.item?.label?.fontWeight ?? 'normal';
  }

  private itemFontFamily(item: ResolvedLegendItem): string {
    return item.labelFont?.fontFamily ?? this.options?.item?.label?.fontFamily ?? this.theme.fontFamily;
  }

  private itemFont(item: ResolvedLegendItem): string {
    return `${this.itemFontWeight(item)} ${this.itemFontSize(item)}px ${this.itemFontFamily(item)}`;
  }

  /** The value text follows the label font unless `item.value` overrides it. */
  private itemValueFontSize(item: ResolvedLegendItem): number {
    return this.options?.item?.value?.fontSize ?? this.itemFontSize(item);
  }

  private itemValueFontFamily(item: ResolvedLegendItem): string {
    return this.options?.item?.value?.fontFamily ?? this.itemFontFamily(item);
  }

  private itemValueFontWeight(item: ResolvedLegendItem): FontWeight {
    return this.options?.item?.value?.fontWeight ?? this.itemFontWeight(item);
  }

  private itemValueFont(item: ResolvedLegendItem): string {
    return `${this.itemValueFontWeight(item)} ${this.itemValueFontSize(item)}px ${this.itemValueFontFamily(item)}`;
  }

  private resolveItems(): ResolvedLegendItem[] {
    const items = resolveLegendItems(this.options?.data, this.items, (ref) => {
      if (this.warnedUnresolved) return;
      this.warnedUnresolved = true;
      console.warn(`grafit: legend item references unknown series "${ref}"`);
    });
    return this.options?.reverse ? [...items].reverse() : items;
  }

  /**
   * Lays items out within the available area and returns the occupied size.
   * top/bottom — wrapping rows, left/right — a column.
   */
  measure(measureText: (text: string, font: string) => number, maxWidth: number, maxHeight: number): { width: number; height: number } {
    this.placed = [];
    this.pagerHits = [];
    const items = this.enabled ? this.resolveItems() : [];
    if (items.length === 0) {
      this.size = { width: 0, height: 0 };
      this.pages = 1;
      return this.size;
    }
    const pad = this.padding;
    const innerWidth = Math.max(0, Math.min(maxWidth, this.widthCap ?? maxWidth) - pad.left - pad.right);
    const innerHeight = Math.max(0, maxHeight - pad.top - pad.bottom);
    // a shared row height keeps the pagination row math valid with per-item marker/font sizes
    const itemHeight = items.reduce((max, item) => Math.max(max, this.itemMarkerSize(item), this.itemFontSize(item)), 0);
    const horizontal = this.position === 'top' || this.position === 'bottom';
    const widths = items.map((item) => {
      const font = this.itemFont(item);
      return (
        this.itemMarkerWidth(item) +
        this.markerGap +
        measureText(item.label, font) +
        (item.value ? this.valueGap + measureText(item.value, this.itemValueFont(item)) : 0)
      );
    });

    // layout of all items: rows (horizontal) or a column (vertical)
    const all: PlacedItem[] = [];
    let x = 0;
    let y = 0;
    items.forEach((item, index) => {
      const width = widths[index] ?? 0;
      if (horizontal) {
        if (x > 0 && x + width > innerWidth) {
          x = 0;
          y += itemHeight + this.rowGap;
        }
        all.push({ item, x, y, width, height: itemHeight });
        x += width + this.itemGap;
      } else {
        all.push({ item, x: 0, y, width, height: itemHeight });
        y += itemHeight + this.rowGap;
      }
    });

    // pagination: horizontal — at most maxRows rows, vertical — by height
    const rowStep = itemHeight + this.rowGap;
    const maxRows = Math.max(1, Math.floor(this.options?.maxRows ?? MAX_ROWS));
    const pageCapacityRows = horizontal ? maxRows : Math.max(1, Math.floor((innerHeight - PAGER_HEIGHT) / rowStep));
    const totalRows = all.length > 0 ? Math.floor((all[all.length - 1]?.y ?? 0) / rowStep) + 1 : 0;
    this.pages = Math.max(1, Math.ceil(totalRows / pageCapacityRows));
    this.page = Math.min(this.page, this.pages - 1);

    const fromRow = this.page * pageCapacityRows;
    const toRow = fromRow + pageCapacityRows;
    this.placed = all
      .filter((placed) => {
        const row = Math.floor(placed.y / rowStep);
        return row >= fromRow && row < toRow;
      })
      .map((placed) => ({ ...placed, y: placed.y - fromRow * rowStep }));

    const usedRows = Math.min(totalRows - fromRow, pageCapacityRows);
    const contentHeight = Math.max(0, usedRows * rowStep - this.rowGap);
    const contentWidth = this.placed.reduce((max, placed) => Math.max(max, placed.x + placed.width), 0);
    const pagerSpace = this.pages > 1 ? PAGER_HEIGHT : 0;
    this.size = { width: contentWidth + pad.left + pad.right, height: contentHeight + pagerSpace + pad.top + pad.bottom };
    return this.size;
  }

  /**
   * Box a floating legend claims inside `rect` (measuring it along the way), for
   * the captions to flow around. Undefined when the legend is docked, empty or
   * explicitly allowed to overlap the captions. Requires `setItems` beforehand.
   */
  captionObstacle(rect: LayoutRect, measureText: (text: string, font: string) => number): LayoutRect | undefined {
    if (!this.enabled || !this.floating || this.options?.avoidCaptions === false) return undefined;
    const size = this.measure(measureText, rect.width, rect.height);
    if (size.width <= 0 || size.height <= 0) return undefined;
    const box = placeLegendBox(this.options?.position ?? 'bottom', size, rect, this.options?.offset);
    return { x: box.x, y: box.y, width: size.width, height: size.height };
  }

  nextPage(delta: number): void {
    this.page = Math.max(0, Math.min(this.pages - 1, this.page + delta));
  }

  /** Glyph of one item, laid out in the marker slot at the left of the row. */
  private renderMarker(placed: PlacedItem, markerWidth: number): Line | Marker {
    const options = this.markerOf(placed.item);
    const size = this.itemMarkerSize(placed.item);
    const centerY = placed.y + placed.height / 2;

    if (options.shape === 'line') {
      const line = new Line();
      line.x1 = placed.x;
      line.x2 = placed.x + markerWidth;
      line.y1 = centerY;
      line.y2 = centerY;
      line.stroke = options.color ?? this.theme.mutedColor;
      line.strokeWidth = options.strokeWidth ?? this.theme.strokeWidth ?? 2;
      line.lineDash = options.lineDash;
      return line;
    }

    const marker = new Marker();
    marker.x = placed.x + size / 2;
    marker.y = centerY;
    marker.size = size;
    marker.shape = options.shape ?? 'square';
    marker.path = options.path;
    if (options.viewBox !== undefined) marker.viewBox = options.viewBox;
    marker.cornerRadius = options.cornerRadius ?? MARKER_CORNER_RADIUS;
    marker.fill = options.color ?? this.theme.mutedColor;
    marker.stroke = options.stroke;
    marker.strokeWidth = options.strokeWidth ?? 1;
    return marker;
  }

  /** Renders the legend; rect is the zone allocated by the layout. */
  render(layer: Group, rect: LayoutRect): void {
    if (!this.enabled || this.placed.length === 0) return;
    // docked: rect is the reserved strip, the second placement token aligns along it;
    // floating: rect is the whole chart area, offset insets from the anchored edges
    const box = placeLegendBox(this.options?.position ?? 'bottom', this.size, rect, this.floating ? this.options?.offset : undefined);

    const background = this.options?.background;
    if (background?.fill !== undefined || background?.stroke !== undefined) {
      const panel = new Rect();
      panel.x = box.x;
      panel.y = box.y;
      panel.width = this.size.width;
      panel.height = this.size.height;
      panel.cornerRadius = background.cornerRadius ?? this.theme.cornerRadius ?? 4;
      panel.fill = background.fill;
      panel.stroke = background.stroke;
      panel.strokeWidth = background.strokeWidth ?? 1;
      panel.shadow = resolveShadow(background.shadow);
      layer.append(panel);
    }

    const pad = this.padding;
    const offsetX = box.x + pad.left;
    const offsetY = box.y + pad.top;
    const group = new Group();
    group.translationX = offsetX;
    group.translationY = offsetY;

    for (const placed of this.placed) {
      const itemGroup = new Group();
      itemGroup.opacity = placed.item.visible ? 1 : (this.options?.item?.hiddenOpacity ?? DISABLED_OPACITY);

      const markerWidth = this.itemMarkerWidth(placed.item);
      itemGroup.append(this.renderMarker(placed, markerWidth));

      const label = new Text();
      label.text = placed.item.label;
      label.x = placed.x + markerWidth + this.markerGap;
      label.y = placed.y + placed.height / 2;
      label.textBaseline = 'middle';
      label.fontSize = this.itemFontSize(placed.item);
      label.fontFamily = this.itemFontFamily(placed.item);
      label.fontWeight = this.itemFontWeight(placed.item);
      label.fill = placed.item.labelFont?.color ?? this.options?.item?.label?.color ?? this.theme.foregroundColor;
      itemGroup.append(label);

      if (placed.item.value) {
        const value = new Text();
        value.text = placed.item.value;
        value.x = placed.x + placed.width;
        value.y = placed.y + placed.height / 2;
        value.textAlign = 'right';
        value.textBaseline = 'middle';
        value.fontSize = this.itemValueFontSize(placed.item);
        value.fontFamily = this.itemValueFontFamily(placed.item);
        value.fontWeight = this.itemValueFontWeight(placed.item);
        value.fill = this.options?.item?.value?.color ?? this.theme.mutedColor;
        itemGroup.append(value);
      }

      group.append(itemGroup);
      // absolute coordinates for hit-testing
      placed.x += offsetX;
      placed.y += offsetY;
    }
    layer.append(group);

    if (this.pages > 1) {
      const pagerY = box.y + this.size.height - pad.bottom - PAGER_HEIGHT + 4;
      const centerX = box.x + this.size.width / 2;
      const controls: Array<[string, string, number]> = [
        [LEGEND_PAGER_PREV, '‹', centerX - 26],
        [LEGEND_PAGER_NEXT, '›', centerX + 26],
      ];
      const pageLabel = new Text();
      pageLabel.text = `${this.page + 1}/${this.pages}`;
      pageLabel.x = centerX;
      pageLabel.y = pagerY + 6;
      pageLabel.textAlign = 'center';
      pageLabel.textBaseline = 'middle';
      pageLabel.fontSize = themeFont(this.theme, FONT_STEP.small);
      pageLabel.fontFamily = this.theme.fontFamily;
      pageLabel.fill = this.theme.mutedColor;
      layer.append(pageLabel);
      for (const [id, glyph, cx] of controls) {
        const arrow = new Text();
        arrow.text = glyph;
        arrow.x = cx;
        arrow.y = pagerY + 6;
        arrow.textAlign = 'center';
        arrow.textBaseline = 'middle';
        arrow.fontSize = themeFont(this.theme, FONT_STEP.emphasis);
        arrow.fontFamily = this.theme.fontFamily;
        arrow.fill = this.theme.foregroundColor;
        layer.append(arrow);
        this.pagerHits.push({ id, x: cx - 9, y: pagerY - 4, width: 18, height: 18 });
      }
    }
  }

  hitTest(x: number, y: number): string | undefined {
    for (const pager of this.pagerHits) {
      if (x >= pager.x && x <= pager.x + pager.width && y >= pager.y && y <= pager.y + pager.height) {
        return pager.id;
      }
    }
    for (const placed of this.placed) {
      if (x >= placed.x && x <= placed.x + placed.width && y >= placed.y && y <= placed.y + placed.height) {
        return placed.item.seriesId;
      }
    }
    return undefined;
  }
}

/** Feature API for widgets (via registry.getFeature('legend')). */
export const legendApi = {
  create: (options: LegendOptions | undefined, theme: ThemeContext): Legend => new Legend(options, theme),
  PAGER_PREV: LEGEND_PAGER_PREV,
  PAGER_NEXT: LEGEND_PAGER_NEXT,
};
export type LegendApi = typeof legendApi;

export const legendModule = { kind: 'feature', name: 'legend', api: legendApi } as const;
