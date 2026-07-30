import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { AxisPosition, LegendItemDescriptor, LayoutRect, ThemeContext } from '@/shared/kernel';
import type { ColorValue, FontOptions, FontWeight, Padding, Pixels, Switchable } from '@/shared/options';
import { Group, Rect, Text } from '@/shared/scene';

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
  /** Inner padding; 8 by default when fill/stroke is set, otherwise 0. */
  padding?: Pixels | Padding;
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
  marker?: { color?: ColorValue; size?: Pixels };
  /** Per-item label font; falls back to `item.label`, then the theme. */
  label?: FontOptions;
  /** Value to the right of the label ("label … value"). */
  value?: string;
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
  item?: {
    marker?: { size?: Pixels };
    label?: FontOptions;
  };
  /** Custom items; fully replaces the auto-derived series items. */
  data?: LegendItemOptions[];
}

const MARKER_SIZE = 10;
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
  markerSize?: Pixels;
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
      markerSize: entry.marker?.size,
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
  }

  private get fontSize(): number {
    return this.options?.item?.label?.fontSize ?? themeFont(this.theme, FONT_STEP.heading);
  }

  private get markerSize(): number {
    return this.options?.item?.marker?.size ?? MARKER_SIZE;
  }

  private get padding(): Required<Padding> {
    const background = this.options?.background;
    const raw = background?.padding ?? (background?.fill !== undefined || background?.stroke !== undefined ? 8 : 0);
    if (typeof raw === 'number') return { top: raw, right: raw, bottom: raw, left: raw };
    return { top: raw.top ?? 0, right: raw.right ?? 0, bottom: raw.bottom ?? 0, left: raw.left ?? 0 };
  }

  private itemMarkerSize(item: ResolvedLegendItem): number {
    return item.markerSize ?? this.markerSize;
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

  private resolveItems(): ResolvedLegendItem[] {
    return resolveLegendItems(this.options?.data, this.items, (ref) => {
      if (this.warnedUnresolved) return;
      this.warnedUnresolved = true;
      console.warn(`grafit: legend item references unknown series "${ref}"`);
    });
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
    const innerWidth = Math.max(0, maxWidth - pad.left - pad.right);
    const innerHeight = Math.max(0, maxHeight - pad.top - pad.bottom);
    // a shared row height keeps the pagination row math valid with per-item marker/font sizes
    const itemHeight = items.reduce((max, item) => Math.max(max, this.itemMarkerSize(item), this.itemFontSize(item)), 0);
    const horizontal = this.position === 'top' || this.position === 'bottom';
    const widths = items.map((item) => {
      const font = this.itemFont(item);
      return (
        this.itemMarkerSize(item) +
        MARKER_GAP +
        measureText(item.label, font) +
        (item.value ? VALUE_GAP + measureText(item.value, font) : 0)
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
          y += itemHeight + ITEM_GAP_Y;
        }
        all.push({ item, x, y, width, height: itemHeight });
        x += width + ITEM_GAP_X;
      } else {
        all.push({ item, x: 0, y, width, height: itemHeight });
        y += itemHeight + ITEM_GAP_Y;
      }
    });

    // pagination: horizontal — at most MAX_ROWS rows, vertical — by height
    const rowStep = itemHeight + ITEM_GAP_Y;
    const pageCapacityRows = horizontal ? MAX_ROWS : Math.max(1, Math.floor((innerHeight - PAGER_HEIGHT) / rowStep));
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
    const contentHeight = Math.max(0, usedRows * rowStep - ITEM_GAP_Y);
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
      itemGroup.opacity = placed.item.visible ? 1 : DISABLED_OPACITY;

      const markerSize = this.itemMarkerSize(placed.item);
      const marker = new Rect();
      marker.x = placed.x;
      marker.y = placed.y + (placed.height - markerSize) / 2;
      marker.width = markerSize;
      marker.height = markerSize;
      marker.cornerRadius = 3;
      marker.fill = placed.item.color ?? this.theme.mutedColor;
      itemGroup.append(marker);

      const label = new Text();
      label.text = placed.item.label;
      label.x = placed.x + markerSize + MARKER_GAP;
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
        value.fontSize = this.itemFontSize(placed.item);
        value.fontFamily = this.itemFontFamily(placed.item);
        value.fill = this.theme.mutedColor;
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
