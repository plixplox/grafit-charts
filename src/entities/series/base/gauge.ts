/** What a radial and a linear gauge share: the text they print and the colored scale. */
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { ThemeContext } from '@/shared/kernel';
import type { ColorValue, FontOptions, Switchable } from '@/shared/options';
import type { Text } from '@/shared/scene';

/**
 * A number a gauge prints: the value at its middle, a bound of its scale.
 * The formatter answers what it reads as, the font options how it looks; a
 * size left out follows the gauge, which sizes its own text against its room.
 */
export interface GaugeLabelOptions extends Switchable, FontOptions {
  formatter?: (value: number) => string;
}

/** A stretch of the scale in its own color, reaching up to `to`. */
export interface GaugeSegment {
  to: number;
  color: ColorValue;
}

/** A text style resolved once: series options over what the gauge asked for. */
export interface GaugeTextStyle {
  size: number;
  weight: string;
  family: string;
  color: ColorValue;
  /** The same style as a canvas font string, for measuring. */
  spec: string;
}

export function gaugeTextStyle(
  options: GaugeLabelOptions | undefined,
  fallback: { size?: number; weight?: string; color: ColorValue },
  theme: ThemeContext,
): GaugeTextStyle {
  const size = options?.fontSize ?? fallback.size ?? themeFont(theme, FONT_STEP.label);
  const weight = options?.fontWeight !== undefined ? String(options.fontWeight) : (fallback.weight ?? 'normal');
  const family = options?.fontFamily ?? theme.fontFamily;
  return { size, weight, family, color: options?.color ?? fallback.color, spec: `${weight} ${size}px ${family}` };
}

/** Puts a resolved style on a text node. */
export function styleGaugeText(node: Text, style: GaugeTextStyle): void {
  node.fontSize = style.size;
  node.fontWeight = style.weight;
  node.fontFamily = style.family;
  node.fill = style.color;
}

/** What a gauge prints for a number — its formatter, or the number itself. */
export function gaugeLabelText(value: number, options?: GaugeLabelOptions): string {
  return options?.formatter?.(value) ?? String(value);
}
