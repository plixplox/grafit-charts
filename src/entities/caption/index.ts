import type { ThemeContext } from '@/shared/kernel';
import type { FontOptions, Switchable } from '@/shared/options';
import { Group, Text } from '@/shared/scene';

export interface CaptionOptions extends Switchable, FontOptions {
  text?: string;
}

interface CaptionRole {
  fontSize: number;
  fontWeight: string;
  muted: boolean;
  spacing: number;
}

const ROLES: Record<'title' | 'subtitle', CaptionRole> = {
  title: { fontSize: 17, fontWeight: 'bold', muted: false, spacing: 10 },
  subtitle: { fontSize: 13, fontWeight: 'normal', muted: true, spacing: 10 },
};

/**
 * Renders the caption centered and returns the occupied height
 * (0 if the caption is disabled or empty).
 */
export function renderCaption(
  layer: Group,
  role: 'title' | 'subtitle',
  options: CaptionOptions | undefined,
  theme: ThemeContext,
  width: number,
  top: number,
): number {
  if (!options?.text || options.enabled === false) return 0;
  const config = ROLES[role];
  const node = new Text();
  node.text = options.text;
  node.x = width / 2;
  node.y = top;
  node.textAlign = 'center';
  node.textBaseline = 'top';
  node.fontSize = options.fontSize ?? config.fontSize;
  node.fontWeight = options.fontWeight !== undefined ? String(options.fontWeight) : config.fontWeight;
  node.fontFamily = options.fontFamily ?? theme.fontFamily;
  node.fill = options.color ?? (config.muted ? theme.mutedColor : theme.foregroundColor);
  layer.append(node);
  return node.fontSize + config.spacing;
}
