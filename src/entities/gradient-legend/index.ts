import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { ColorScaleInfo, LayoutRect, ThemeContext } from '@/shared/kernel';
import type { Pixels, Switchable } from '@/shared/options';
import { ColorScale } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';

export interface GradientLegendOptions extends Switchable {
  /** Side on which the scale is placed (right by default). */
  position?: 'right' | 'bottom';
  /** Spacing between the scale and the plot area (10 by default). */
  spacing?: Pixels;
  /** Thickness of the color bar (12 by default). */
  thickness?: Pixels;
}

export const GRADIENT_LEGEND_WIDTH = 52;
export const GRADIENT_LEGEND_HEIGHT = 36;
const BAR_WIDTH = 12;
const STEPS = 24;

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
  const horizontal = options?.position === 'bottom';

  if (horizontal) {
    const barWidth = rect.width * 0.6;
    const left = rect.x + (rect.width - barWidth) / 2;
    const stepWidth = barWidth / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const segment = new Rect();
      segment.y = rect.y;
      segment.height = thickness;
      segment.x = left + i * stepWidth;
      segment.width = stepWidth + 0.5;
      segment.fill = scale.convert(i);
      layer.append(segment);
    }
    const labels: Array<[number, string, CanvasTextAlign]> = [
      [left - 6, String(info.min), 'right'],
      [left + barWidth + 6, String(info.max), 'left'],
    ];
    for (const [x, text, align] of labels) {
      const node = new Text();
      node.text = text;
      node.x = x;
      node.y = rect.y + thickness / 2;
      node.textAlign = align;
      node.textBaseline = 'middle';
      node.fontSize = themeFont(theme, FONT_STEP.small);
      node.fontFamily = theme.fontFamily;
      node.fill = theme.mutedColor;
      layer.append(node);
    }
    return;
  }

  const barHeight = rect.height * 0.8;
  const top = rect.y + (rect.height - barHeight) / 2;
  const stepHeight = barHeight / STEPS;
  for (let i = 0; i < STEPS; i++) {
    const segment = new Rect();
    segment.x = rect.x;
    segment.width = thickness;
    // top is the maximum
    segment.y = top + barHeight - (i + 1) * stepHeight;
    segment.height = stepHeight + 0.5;
    segment.fill = scale.convert(i);
    layer.append(segment);
  }
  const labels: Array<[number, string]> = [
    [top, String(info.max)],
    [top + barHeight, String(info.min)],
  ];
  for (const [y, text] of labels) {
    const node = new Text();
    node.text = text;
    node.x = rect.x + thickness + 5;
    node.y = y;
    node.textBaseline = 'middle';
    node.fontSize = themeFont(theme, FONT_STEP.small);
    node.fontFamily = theme.fontFamily;
    node.fill = theme.mutedColor;
    layer.append(node);
  }
}

/** Feature API for widgets (via registry.getFeature('gradient-legend')). */
export const gradientLegendApi = {
  render: renderGradientLegend,
  WIDTH: GRADIENT_LEGEND_WIDTH,
  HEIGHT: GRADIENT_LEGEND_HEIGHT,
};
export type GradientLegendApi = typeof gradientLegendApi;

export const gradientLegendModule = { kind: 'feature', name: 'gradient-legend', api: gradientLegendApi } as const;
