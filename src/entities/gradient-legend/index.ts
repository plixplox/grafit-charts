import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { ColorScaleInfo, LayoutRect, ThemeContext } from '@/shared/kernel';
import type { Pixels, Switchable } from '@/shared/options';
import { ColorScale } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';
import { formatValue } from '@/shared/util';

export type GradientLegendPosition = 'top' | 'right' | 'bottom' | 'left';

export interface GradientLegendOptions extends Switchable {
  /** Side on which the scale is placed (right by default). */
  position?: GradientLegendPosition;
  /** Spacing between the scale and the plot area (10 by default). */
  spacing?: Pixels;
  /** Thickness of the color bar (12 by default). */
  thickness?: Pixels;
  /** Labels of the scale ends (enabled by default). */
  label?: Switchable & {
    /** Serializable format string (',.2f', '.0%'); `formatter` wins over it. */
    format?: string;
    /** Text of an end label (the raw value by default). */
    formatter?: (params: { value: number }) => string;
  };
}

export const GRADIENT_LEGEND_WIDTH = 52;
export const GRADIENT_LEGEND_HEIGHT = 36;
export const GRADIENT_LEGEND_BAR = 12;
const BAR_WIDTH = GRADIENT_LEGEND_BAR;
const STEPS = 24;
/** Gap between the bar and the label beside it. */
const LABEL_GAP = 6;

/** Top and bottom lay the bar out along the x axis; left and right along the y. */
export function gradientLegendHorizontal(position?: GradientLegendPosition): boolean {
  return position === 'top' || position === 'bottom';
}

/** What the ends are measured and drawn with; without it the fallback sizes apply. */
export interface GradientLegendMetrics {
  info: ColorScaleInfo;
  theme: ThemeContext;
  measureText: (text: string, font: string) => number;
}

/** Text of a scale end: the formatter, then the format string, then the raw value. */
function endLabel(value: number, options?: GradientLegendOptions): string {
  const label = options?.label;
  if (label?.formatter) return label.formatter({ value });
  return label?.format ? formatValue(label.format, value) : String(value);
}

function labelFontSize(theme: ThemeContext): number {
  return themeFont(theme, FONT_STEP.small);
}

/**
 * Room the scale takes across its side. Without the end labels that is the bar
 * alone; with them it is the bar plus whatever the wider of the two ends really
 * measures — a formatter is free to make them long, and a fixed reserve would
 * push them off the chart. Called without metrics (no text to measure yet), the
 * fallback sizes stand in.
 */
export function gradientLegendExtent(options?: GradientLegendOptions, metrics?: GradientLegendMetrics): number {
  const thickness = options?.thickness ?? BAR_WIDTH;
  if (options?.label?.enabled === false) return thickness;
  const horizontal = gradientLegendHorizontal(options?.position);
  if (!metrics) return horizontal ? GRADIENT_LEGEND_HEIGHT : GRADIENT_LEGEND_WIDTH;
  const fontSize = labelFontSize(metrics.theme);
  // the ends sit along the bar, not across it: level with a horizontal one, above
  // and below a vertical one — either way they only widen it when they are wider
  if (horizontal) return Math.max(thickness, fontSize);
  const font = `normal ${fontSize}px ${metrics.theme.fontFamily}`;
  const widest = Math.max(
    metrics.measureText(endLabel(metrics.info.min, options), font),
    metrics.measureText(endLabel(metrics.info.max, options), font),
  );
  return Math.max(thickness, Math.ceil(widest));
}

/** Color scale (heatmap and other colorField series): vertical or horizontal. */
export function renderGradientLegend(
  layer: Group,
  rect: LayoutRect,
  info: ColorScaleInfo,
  theme: ThemeContext,
  options?: GradientLegendOptions,
): void {
  const scale = new ColorScale([0, STEPS - 1], info.colors);
  const thickness = options?.thickness ?? BAR_WIDTH;
  const horizontal = gradientLegendHorizontal(options?.position);
  const labelled = options?.label?.enabled !== false;

  if (horizontal) {
    const barWidth = rect.width * 0.6;
    const left = rect.x + (rect.width - barWidth) / 2;
    const stepWidth = barWidth / STEPS;
    // the bar is centred across the strip, as the vertical one is
    const barTop = rect.y + (rect.height - thickness) / 2;
    for (let i = 0; i < STEPS; i++) {
      const segment = new Rect();
      segment.y = barTop;
      segment.height = thickness;
      segment.x = left + i * stepWidth;
      segment.width = stepWidth + 0.5;
      segment.fill = scale.convert(i);
      layer.append(segment);
    }
    if (!labelled) return;
    const labels: Array<[number, string, CanvasTextAlign]> = [
      [left - LABEL_GAP, endLabel(info.min, options), 'right'],
      [left + barWidth + LABEL_GAP, endLabel(info.max, options), 'left'],
    ];
    for (const [x, text, align] of labels) {
      const node = new Text();
      node.text = text;
      node.x = x;
      node.y = barTop + thickness / 2;
      node.textAlign = align;
      node.textBaseline = 'middle';
      node.fontSize = labelFontSize(theme);
      node.fontFamily = theme.fontFamily;
      node.fill = theme.mutedColor;
      layer.append(node);
    }
    return;
  }

  // the ends cap the bar instead of standing beside it, so they take height, not width
  const labelRoom = labelled ? labelFontSize(theme) + LABEL_GAP : 0;
  const barHeight = Math.max(0, rect.height - 2 * labelRoom);
  const top = rect.y + labelRoom;
  const barLeft = rect.x + (rect.width - thickness) / 2;
  const stepHeight = barHeight / STEPS;
  for (let i = 0; i < STEPS; i++) {
    const segment = new Rect();
    segment.x = barLeft;
    segment.width = thickness;
    // top is the maximum
    segment.y = top + barHeight - (i + 1) * stepHeight;
    segment.height = stepHeight + 0.5;
    segment.fill = scale.convert(i);
    layer.append(segment);
  }
  if (!labelled) return;
  const labels: Array<[number, string, CanvasTextBaseline]> = [
    [top - LABEL_GAP, endLabel(info.max, options), 'bottom'],
    [top + barHeight + LABEL_GAP, endLabel(info.min, options), 'top'],
  ];
  for (const [y, text, baseline] of labels) {
    const node = new Text();
    node.text = text;
    node.x = rect.x + rect.width / 2;
    node.y = y;
    node.textAlign = 'center';
    node.textBaseline = baseline;
    node.fontSize = labelFontSize(theme);
    node.fontFamily = theme.fontFamily;
    node.fill = theme.mutedColor;
    layer.append(node);
  }
}

/** Feature API for widgets (via registry.getFeature('gradient-legend')). */
export const gradientLegendApi = {
  render: renderGradientLegend,
  extent: gradientLegendExtent,
  isHorizontal: gradientLegendHorizontal,
  WIDTH: GRADIENT_LEGEND_WIDTH,
  HEIGHT: GRADIENT_LEGEND_HEIGHT,
};
export type GradientLegendApi = typeof gradientLegendApi;

export const gradientLegendModule = { kind: 'feature', name: 'gradient-legend', api: gradientLegendApi } as const;
