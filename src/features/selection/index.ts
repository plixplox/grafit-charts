import type { ZoomWindow } from '@/shared/kernel';
import type { Datum, Switchable } from '@/shared/options';

export interface SelectionItemStyle {
  stroke?: string;
  strokeWidth?: number;
  /** Size multiplier for markers of selected nodes. */
  sizeRatio?: number;
}

export interface SelectionOptions extends Switchable {
  /**
   * single — each selection replaces the previous one;
   * multiple — boxes and clicks accumulate the selection (clicking a node toggles it).
   */
  mode?: 'single' | 'multiple';
  /** Drag selection box (multiple mode only, disabled by default). */
  boxSelect?: boolean;
  /** Appearance of selected nodes. */
  itemStyle?: SelectionItemStyle;
  /** Opacity of unselected nodes while a selection is active (0.45 by default). */
  inactiveOpacity?: number;
}

export interface SelectedItem {
  seriesId: string;
  datumIndex: number;
  datum: Datum;
}

export interface SelectionChangeEvent {
  items: SelectedItem[];
}

export interface NodeClickEvent {
  seriesId: string;
  datumIndex: number;
  datum: Datum;
}

export interface ZoomChangeEvent {
  /** Visible domain fractions 0..1 per axis. */
  x: ZoomWindow;
  y: ZoomWindow;
}

export interface LegendItemClickEvent {
  /** Series or a pie/donut item (of the form 'seriesId#index'). */
  seriesId: string;
  /** Visibility after the click. */
  visible: boolean;
}

/** Chart event listeners. */
export interface ChartListeners {
  selectionChange?: (event: SelectionChangeEvent) => void;
  nodeClick?: (event: NodeClickEvent) => void;
  zoomChange?: (event: ZoomChangeEvent) => void;
  legendItemClick?: (event: LegendItemClickEvent) => void;
}
