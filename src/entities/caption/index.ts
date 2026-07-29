import type { LayoutRect, ThemeContext } from '@/shared/kernel';
import type { FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Text } from '@/shared/scene';

export interface CaptionOptions extends Switchable, FontOptions {
  text?: string;
  /** Horizontal alignment within the chart width ('center' by default). */
  textAlign?: 'left' | 'center' | 'right';
  /** Vertical placement: above ('top', default) or below ('bottom') the plot. */
  position?: 'top' | 'bottom';
  /**
   * Gap on the plot-facing side of the caption — below it in the 'top' zone,
   * above it in the 'bottom' zone (8 by default). When both captions share a
   * zone, the gap of the outer one separates the two captions, and the gap of
   * the one closest to the plot separates it from the plot.
   */
  spacing?: Pixels;
  /**
   * Break the text onto several lines when it does not fit the available width
   * (true by default). Line breaks written as '\n' always apply.
   */
  wrap?: boolean;
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

/** Baseline-to-baseline step of a wrapped caption, as a multiple of the font size. */
const LINE_HEIGHT = 1.25;
/** Horizontal breathing room kept between a caption line and the box it flows around. */
const OBSTACLE_GAP = 10;
/** Passes allowed for the 'bottom' zone to settle (its start depends on its own height). */
const SETTLE_PASSES = 3;

export interface CaptionLayoutContext {
  measureText: (text: string, font: string) => number;
  /**
   * Box the captions flow around — a floating legend, in scene coordinates.
   * Lines overlapping it vertically are laid out in the wider side gap.
   */
  obstacle?: LayoutRect;
}

/** Horizontal room available to a caption line. */
interface Span {
  left: number;
  right: number;
}

interface CaptionLine {
  text: string;
  /** Anchor point of the line, matching `align`. */
  x: number;
  y: number;
  align: 'left' | 'center' | 'right';
}

interface CaptionPlacement {
  role: 'title' | 'subtitle';
  options: CaptionOptions;
  fontSize: number;
  /** Height of the whole block: the lines plus `spacing`. */
  height: number;
  lines: CaptionLine[];
}

function captionMetrics(role: 'title' | 'subtitle', options: CaptionOptions | undefined): { fontSize: number; spacing: number } | undefined {
  if (!options?.text || options.enabled === false) return undefined;
  const config = ROLES[role];
  return { fontSize: options.fontSize ?? config.fontSize, spacing: options.spacing ?? config.spacing };
}

/** Whether anything will be drawn at all — lets callers skip preparing the layout context. */
export function hasCaptions(title: CaptionOptions | undefined, subtitle: CaptionOptions | undefined): boolean {
  return captionMetrics('title', title) !== undefined || captionMetrics('subtitle', subtitle) !== undefined;
}

/** Room for a line spanning [top, bottom): the full width, or the wider side of the obstacle. */
function lineSpan(full: Span, top: number, bottom: number, obstacle: LayoutRect | undefined): Span {
  if (!obstacle || bottom <= obstacle.y || top >= obstacle.y + obstacle.height) return full;
  const before: Span = { left: full.left, right: Math.min(full.right, obstacle.x - OBSTACLE_GAP) };
  const after: Span = { left: Math.max(full.left, obstacle.x + obstacle.width + OBSTACLE_GAP), right: full.right };
  const widest = after.right - after.left > before.right - before.left ? after : before;
  // the obstacle leaves no usable gap — keep the full width instead of squeezing the text to nothing
  return widest.right - widest.left > 0 ? widest : full;
}

/**
 * Greedy word wrap around the obstacle: every line asks `spanAt` for its own
 * room, so lines level with the obstacle are shorter than the ones below it.
 * '\n' always starts a new line; a word wider than the line is not broken up.
 */
function wrapText(
  text: string,
  font: string,
  measureText: (text: string, font: string) => number,
  spanAt: (index: number) => Span,
  wrap: boolean,
): Array<{ text: string; span: Span }> {
  const lines: Array<{ text: string; span: Span }> = [];
  for (const paragraph of text.split('\n')) {
    let span = spanAt(lines.length);
    let current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (wrap && current && measureText(candidate, font) > span.right - span.left) {
        lines.push({ text: current, span });
        span = spanAt(lines.length);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push({ text: current, span });
  }
  return lines;
}

/**
 * Lays a caption out inside `full`, starting at `blockTop`. `spacing` faces the
 * plot: it trails the text in the 'top' zone ('after') and leads it in the
 * 'bottom' one ('before'). Returns undefined for a disabled or empty caption.
 */
function layoutCaption(
  role: 'title' | 'subtitle',
  options: CaptionOptions | undefined,
  theme: ThemeContext,
  full: Span,
  blockTop: number,
  spacingSide: 'before' | 'after',
  context: CaptionLayoutContext,
): CaptionPlacement | undefined {
  const metrics = captionMetrics(role, options);
  if (!metrics || !options) return undefined;
  const config = ROLES[role];
  const { fontSize, spacing } = metrics;
  const fontWeight = options.fontWeight !== undefined ? String(options.fontWeight) : config.fontWeight;
  const font = `${fontWeight} ${fontSize}px ${options.fontFamily ?? theme.fontFamily}`;
  const step = fontSize * LINE_HEIGHT;
  const textTop = spacingSide === 'before' ? blockTop + spacing : blockTop;
  const spanAt = (index: number) => lineSpan(full, textTop + index * step, textTop + index * step + fontSize, context.obstacle);

  const align = options.textAlign ?? 'center';
  const lines = wrapText(options.text ?? '', font, context.measureText, spanAt, options.wrap !== false).map(({ text, span }, index) => ({
    text,
    align,
    x: align === 'left' ? span.left : align === 'right' ? span.right : (span.left + span.right) / 2,
    y: textTop + index * step,
  }));
  return { role, options, fontSize, height: fontSize + (lines.length - 1) * step + spacing, lines };
}

function drawCaption(layer: Group, placement: CaptionPlacement, theme: ThemeContext): void {
  const config = ROLES[placement.role];
  const { options } = placement;
  for (const line of placement.lines) {
    const node = new Text();
    node.text = line.text;
    node.x = line.x;
    node.y = line.y;
    node.textAlign = line.align;
    node.textBaseline = 'top';
    node.fontSize = placement.fontSize;
    node.fontWeight = options.fontWeight !== undefined ? String(options.fontWeight) : config.fontWeight;
    node.fontFamily = options.fontFamily ?? theme.fontFamily;
    node.fill = options.color ?? (config.muted ? theme.mutedColor : theme.foregroundColor);
    layer.append(node);
  }
}

/**
 * Places the title and subtitle around the plot: 'top' captions stack below
 * `padding.top`, 'bottom' ones sit above `padding.bottom` (the title stays
 * above the subtitle in both zones, `spacing` faces the plot). Long text wraps
 * within the available width, flowing around `context.obstacle`. Returns the
 * placements plus the space consumed from each edge, padding excluded.
 */
export function layoutCaptions(
  title: CaptionOptions | undefined,
  subtitle: CaptionOptions | undefined,
  theme: ThemeContext,
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  context: CaptionLayoutContext,
): { placements: CaptionPlacement[]; top: number; bottom: number } {
  const full: Span = { left: padding.left, right: width - padding.right };
  const entries: Array<['title' | 'subtitle', CaptionOptions | undefined]> = [
    ['title', title],
    ['subtitle', subtitle],
  ];
  const zone = (position: 'top' | 'bottom') =>
    entries.filter(([, options]) => (options?.position === 'bottom' ? position === 'bottom' : position === 'top'));

  const placements: CaptionPlacement[] = [];
  let top = 0;
  for (const [role, options] of zone('top')) {
    const placement = layoutCaption(role, options, theme, full, padding.top + top, 'after', context);
    if (!placement) continue;
    placements.push(placement);
    top += placement.height;
  }

  // the 'bottom' zone starts at its own height above the edge, and that height
  // may grow once the lines flow around the obstacle — re-run until it settles
  const bottomEntries = zone('bottom');
  let bottom = 0;
  let bottomPlacements: CaptionPlacement[] = [];
  for (let pass = 0; pass < SETTLE_PASSES && bottomEntries.length > 0; pass++) {
    const start = height - padding.bottom - bottom;
    let cursor = start;
    bottomPlacements = [];
    for (const [role, options] of bottomEntries) {
      const placement = layoutCaption(role, options, theme, full, cursor, 'before', context);
      if (!placement) continue;
      bottomPlacements.push(placement);
      cursor += placement.height;
    }
    const settled = cursor - start === bottom;
    bottom = cursor - start;
    if (settled) break;
  }

  return { placements: [...placements, ...bottomPlacements], top, bottom };
}

/**
 * Renders the title and subtitle around the plot (see {@link layoutCaptions})
 * and returns the space consumed from each edge, padding excluded.
 */
export function renderCaptions(
  layer: Group,
  title: CaptionOptions | undefined,
  subtitle: CaptionOptions | undefined,
  theme: ThemeContext,
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  context: CaptionLayoutContext,
): { top: number; bottom: number } {
  const { placements, top, bottom } = layoutCaptions(title, subtitle, theme, width, height, padding, context);
  for (const placement of placements) drawCaption(layer, placement, theme);
  return { top, bottom };
}
