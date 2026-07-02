import type { ThemeContext } from '@/shared/kernel';
import type { FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Text } from '@/shared/scene';

export interface CaptionOptions extends Switchable, FontOptions {
  text?: string;
  /** Horizontal alignment within the chart width ('center' by default). */
  textAlign?: 'left' | 'center' | 'right';
  /** Vertical placement: above ('top', default) or below ('bottom') the plot. */
  position?: 'top' | 'bottom';
  /** Gap separating the caption from the plot area (8 by default). */
  spacing?: Pixels;
}

interface CaptionRole {
  fontSize: number;
  fontWeight: string;
  muted: boolean;
  spacing: number;
}

const ROLES: Record<'title' | 'subtitle', CaptionRole> = {
  title: { fontSize: 17, fontWeight: 'bold', muted: false, spacing: 8 },
  subtitle: { fontSize: 13, fontWeight: 'normal', muted: true, spacing: 8 },
};

function captionMetrics(role: 'title' | 'subtitle', options: CaptionOptions | undefined): { fontSize: number; spacing: number } | undefined {
  if (!options?.text || options.enabled === false) return undefined;
  const config = ROLES[role];
  return { fontSize: options.fontSize ?? config.fontSize, spacing: options.spacing ?? config.spacing };
}

function drawCaption(
  layer: Group,
  role: 'title' | 'subtitle',
  options: CaptionOptions,
  theme: ThemeContext,
  width: number,
  top: number,
  inset?: { left: number; right: number },
): void {
  const config = ROLES[role];
  const align = options.textAlign ?? 'center';
  const node = new Text();
  node.text = options.text ?? '';
  node.x = align === 'left' ? (inset?.left ?? 0) : align === 'right' ? width - (inset?.right ?? 0) : width / 2;
  node.y = top;
  node.textAlign = align;
  node.textBaseline = 'top';
  node.fontSize = options.fontSize ?? config.fontSize;
  node.fontWeight = options.fontWeight !== undefined ? String(options.fontWeight) : config.fontWeight;
  node.fontFamily = options.fontFamily ?? theme.fontFamily;
  node.fill = options.color ?? (config.muted ? theme.mutedColor : theme.foregroundColor);
  layer.append(node);
}

/**
 * Renders a single caption at `top` (ignores `position`) and returns the
 * occupied height (0 if the caption is disabled or empty). `inset` is the
 * horizontal chart padding that left/right alignment snaps to.
 */
export function renderCaption(
  layer: Group,
  role: 'title' | 'subtitle',
  options: CaptionOptions | undefined,
  theme: ThemeContext,
  width: number,
  top: number,
  inset?: { left: number; right: number },
): number {
  const metrics = captionMetrics(role, options);
  if (!metrics || !options) return 0;
  drawCaption(layer, role, options, theme, width, top, inset);
  return metrics.fontSize + metrics.spacing;
}

/**
 * Renders the title and subtitle around the plot: 'top' captions stack below
 * `padding.top`, 'bottom' ones sit above `padding.bottom` (the title stays
 * above the subtitle in both zones, `spacing` faces the plot). Returns the
 * space consumed from each edge, padding excluded.
 */
export function renderCaptions(
  layer: Group,
  title: CaptionOptions | undefined,
  subtitle: CaptionOptions | undefined,
  theme: ThemeContext,
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
): { top: number; bottom: number } {
  const inset = { left: padding.left, right: padding.right };
  const entries: Array<['title' | 'subtitle', CaptionOptions | undefined]> = [
    ['title', title],
    ['subtitle', subtitle],
  ];

  let top = 0;
  for (const [role, options] of entries) {
    if (options?.position === 'bottom') continue;
    top += renderCaption(layer, role, options, theme, width, padding.top + top, inset);
  }

  const bottomEntries = entries.flatMap(([role, options]) => {
    if (options?.position !== 'bottom') return [];
    const metrics = captionMetrics(role, options);
    return metrics && options ? [{ role, options, metrics }] : [];
  });
  const bottom = bottomEntries.reduce((sum, entry) => sum + entry.metrics.fontSize + entry.metrics.spacing, 0);
  let y = height - padding.bottom - bottom;
  for (const { role, options, metrics } of bottomEntries) {
    drawCaption(layer, role, options, theme, width, y + metrics.spacing, inset);
    y += metrics.spacing + metrics.fontSize;
  }
  return { top, bottom };
}
