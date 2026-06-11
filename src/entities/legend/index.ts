import type { AxisPosition, LegendItemDescriptor, LayoutRect, ThemeContext } from '@/shared/kernel';
import type { FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Rect, Text } from '@/shared/scene';

export interface LegendOptions extends Switchable {
  position?: AxisPosition;
  /** Clicking an item toggles series visibility (true by default). */
  toggleSeries?: boolean;
  item?: {
    marker?: { size?: Pixels };
    label?: FontOptions;
  };
}

const MARKER_SIZE = 10;
const MARKER_GAP = 6;
const ITEM_GAP_X = 18;
const VALUE_GAP = 14;
const ITEM_GAP_Y = 8;
const FONT_SIZE = 12;
const DISABLED_OPACITY = 0.4;

interface PlacedItem {
  item: LegendItemDescriptor;
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

  constructor(
    private readonly options: LegendOptions | undefined,
    private readonly theme: ThemeContext,
  ) {}

  get enabled(): boolean {
    return this.options?.enabled !== false;
  }

  get position(): AxisPosition {
    return this.options?.position ?? 'bottom';
  }

  get toggleSeries(): boolean {
    return this.options?.toggleSeries !== false;
  }

  setItems(items: LegendItemDescriptor[]): void {
    this.items = items;
  }

  private get fontSize(): number {
    return this.options?.item?.label?.fontSize ?? FONT_SIZE;
  }

  private get markerSize(): number {
    return this.options?.item?.marker?.size ?? MARKER_SIZE;
  }

  private font(): string {
    const label = this.options?.item?.label;
    return `${label?.fontWeight ?? 'normal'} ${this.fontSize}px ${label?.fontFamily ?? this.theme.fontFamily}`;
  }

  /**
   * Lays items out within the available area and returns the occupied size.
   * top/bottom — wrapping rows, left/right — a column.
   */
  measure(measureText: (text: string, font: string) => number, maxWidth: number, maxHeight: number): { width: number; height: number } {
    this.placed = [];
    this.pagerHits = [];
    if (!this.enabled || this.items.length === 0) {
      this.size = { width: 0, height: 0 };
      this.pages = 1;
      return this.size;
    }
    const font = this.font();
    const itemHeight = Math.max(this.markerSize, this.fontSize);
    const horizontal = this.position === 'top' || this.position === 'bottom';
    const widths = this.items.map(
      (item) => this.markerSize + MARKER_GAP + measureText(item.label, font) + (item.value ? VALUE_GAP + measureText(item.value, font) : 0),
    );

    // layout of all items: rows (horizontal) or a column (vertical)
    const all: PlacedItem[] = [];
    let x = 0;
    let y = 0;
    this.items.forEach((item, index) => {
      const width = widths[index] ?? 0;
      if (horizontal) {
        if (x > 0 && x + width > maxWidth) {
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
    const pageCapacityRows = horizontal ? MAX_ROWS : Math.max(1, Math.floor((maxHeight - PAGER_HEIGHT) / rowStep));
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
    this.size = { width: contentWidth, height: contentHeight + pagerSpace };
    return this.size;
  }

  nextPage(delta: number): void {
    this.page = Math.max(0, Math.min(this.pages - 1, this.page + delta));
  }

  /** Renders the legend; rect is the zone allocated by the layout. */
  render(layer: Group, rect: LayoutRect): void {
    if (!this.enabled || this.placed.length === 0) return;
    const horizontal = this.position === 'top' || this.position === 'bottom';
    const offsetX = horizontal ? rect.x + (rect.width - this.size.width) / 2 : rect.x;
    const offsetY = horizontal ? rect.y : rect.y + (rect.height - this.size.height) / 2;
    const group = new Group();
    group.translationX = offsetX;
    group.translationY = offsetY;

    for (const placed of this.placed) {
      const itemGroup = new Group();
      itemGroup.opacity = placed.item.visible ? 1 : DISABLED_OPACITY;

      const marker = new Rect();
      marker.x = placed.x;
      marker.y = placed.y + (placed.height - this.markerSize) / 2;
      marker.width = this.markerSize;
      marker.height = this.markerSize;
      marker.cornerRadius = 3;
      marker.fill = placed.item.color;
      itemGroup.append(marker);

      const label = new Text();
      label.text = placed.item.label;
      label.x = placed.x + this.markerSize + MARKER_GAP;
      label.y = placed.y + placed.height / 2;
      label.textBaseline = 'middle';
      label.fontSize = this.fontSize;
      label.fontFamily = this.options?.item?.label?.fontFamily ?? this.theme.fontFamily;
      label.fill = this.options?.item?.label?.color ?? this.theme.foregroundColor;
      itemGroup.append(label);

      if (placed.item.value) {
        const value = new Text();
        value.text = placed.item.value;
        value.x = placed.x + placed.width;
        value.y = placed.y + placed.height / 2;
        value.textAlign = 'right';
        value.textBaseline = 'middle';
        value.fontSize = this.fontSize;
        value.fontFamily = this.options?.item?.label?.fontFamily ?? this.theme.fontFamily;
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
      const pagerY = offsetY + this.size.height - PAGER_HEIGHT + 4;
      const centerX = offsetX + this.size.width / 2;
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
      pageLabel.fontSize = 10;
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
        arrow.fontSize = 14;
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
