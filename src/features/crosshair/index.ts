import type { LayoutRect, ThemeContext } from '@/shared/kernel';
import type { ColorValue, Pixels, Switchable } from '@/shared/options';
import { Group, Line, Rect, Text } from '@/shared/scene';

export interface CrosshairOptions extends Switchable {
  /** Snap to the nearest node (true by default). */
  snap?: boolean;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  lineDash?: Pixels[];
  label?: Switchable;
}

export interface CrosshairRenderArgs {
  layer: Group;
  plot: LayoutRect;
  theme: ThemeContext;
  x?: number;
  y?: number;
  xLabel?: string;
  yLabel?: string;
}

const LABEL_FONT_SIZE = 11;
const LABEL_PAD = 4;

export function renderCrosshair(options: CrosshairOptions | undefined, args: CrosshairRenderArgs): void {
  const { layer, plot, theme } = args;
  const stroke = options?.stroke ?? theme.mutedColor;
  const strokeWidth = options?.strokeWidth ?? 1;
  const lineDash = options?.lineDash ?? [4, 3];
  const labelsEnabled = options?.label?.enabled !== false;

  if (args.x !== undefined && args.x >= plot.x && args.x <= plot.x + plot.width) {
    const line = new Line();
    line.x1 = line.x2 = args.x;
    line.y1 = plot.y;
    line.y2 = plot.y + plot.height;
    line.stroke = stroke;
    line.strokeWidth = strokeWidth;
    line.lineDash = lineDash;
    layer.append(line);
    if (labelsEnabled && args.xLabel) {
      appendLabel(layer, theme, args.xLabel, args.x, plot.y + plot.height + 3, 'center', 'top');
    }
  }
  if (args.y !== undefined && args.y >= plot.y && args.y <= plot.y + plot.height) {
    const line = new Line();
    line.y1 = line.y2 = args.y;
    line.x1 = plot.x;
    line.x2 = plot.x + plot.width;
    line.stroke = stroke;
    line.strokeWidth = strokeWidth;
    line.lineDash = lineDash;
    layer.append(line);
    if (labelsEnabled && args.yLabel) {
      appendLabel(layer, theme, args.yLabel, plot.x - 3, args.y, 'right', 'middle');
    }
  }
}

function appendLabel(
  layer: Group,
  theme: ThemeContext,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign,
  baseline: CanvasTextBaseline,
): void {
  const width = text.length * LABEL_FONT_SIZE * 0.62 + LABEL_PAD * 2;
  const height = LABEL_FONT_SIZE + LABEL_PAD * 2;
  const rect = new Rect();
  rect.width = width;
  rect.height = height;
  rect.x = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  rect.y = baseline === 'middle' ? y - height / 2 : baseline === 'top' ? y : y - height;
  rect.fill = theme.foregroundColor;
  rect.cornerRadius = 3;
  layer.append(rect);

  const node = new Text();
  node.text = text;
  node.x = rect.x + width / 2;
  node.y = rect.y + height / 2;
  node.textAlign = 'center';
  node.textBaseline = 'middle';
  node.fontSize = LABEL_FONT_SIZE;
  node.fontFamily = theme.fontFamily;
  node.fill = theme.backgroundColor;
  layer.append(node);
}

/** Feature API for widgets (via registry.getFeature('crosshair')). */
export const crosshairApi = { render: renderCrosshair };
export type CrosshairApi = typeof crosshairApi;

export const crosshairModule = { kind: 'feature', name: 'crosshair', api: crosshairApi } as const;
