import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { LayoutRect, ThemeContext } from '@/shared/kernel';
import { resolvePadding, type FontOptions, type Padding, type PaddingValue, type Pixels, type Switchable } from '@/shared/options';
import { Group, Text } from '@/shared/scene';

export interface CaptionOptions extends Switchable, FontOptions {
  text?: string;
  /** Horizontal alignment within the chart width ('center' by default). */
  textAlign?: 'left' | 'center' | 'right';
  /** Vertical placement: above ('top', default) or below ('bottom') the plot. */
  position?: 'top' | 'bottom';
  /**
   * Padding around the caption text in any CSS-like shorthand — `8`, `[8, 12]`,
   * `[8, 12, 4, 0]` or `{ top, right, bottom, left }`. By default only the
   * plot-facing side is padded (8 px): below the caption in the 'top' zone,
   * above it in the 'bottom' zone. When both captions share a zone, the padding
   * of the outer one separates the two captions, and the padding of the one
   * closest to the plot separates it from the plot. Horizontal padding narrows
   * the width the text is wrapped within.
   */
  padding?: PaddingValue;
  /**
   * Gap on the plot-facing side of the caption (8 by default).
   *
   * @deprecated Use `padding` — it covers the same gap and the other three
   * sides. Kept as the default for the plot-facing side of `padding`.
   */
  spacing?: Pixels;
  /**
   * Break the text onto several lines when it does not fit the available width
   * (true by default). Line breaks written as '\n' always apply.
   */
  wrap?: boolean;
}

interface CaptionRole {
  fontStep: number;
  fontWeight: string;
  muted: boolean;
  /** Default padding on the plot-facing side; the other three sides default to 0. */
  plotGap: number;
}

const ROLES: Record<'title' | 'subtitle', CaptionRole> = {
  title: { fontStep: FONT_STEP.title, fontWeight: 'bold', muted: false, plotGap: 8 },
  subtitle: { fontStep: FONT_STEP.subtitle, fontWeight: 'normal', muted: true, plotGap: 8 },
};

/** Baseline-to-baseline step of a wrapped caption, as a multiple of the font size. */
const LINE_HEIGHT = 1.25;
/** Horizontal breathing room kept between a caption line and the box it flows around. */
const OBSTACLE_GAP = 10;
/** Passes allowed for the 'bottom' zone to settle (its start depends on its own height). */
const SETTLE_PASSES = 3;
/** Passes allowed for the captions and the obstacle to settle on a width each can live with. */
const FIT_PASSES = 3;
/** Share of the width an obstacle keeps whatever the captions ask for. */
const MIN_OBSTACLE_SHARE = 0.5;

export interface CaptionLayoutContext {
  measureText: (text: string, font: string) => number;
  /**
   * Box the captions flow around — a floating legend, in scene coordinates.
   * Lines overlapping it vertically are laid out in the wider side gap. Asked
   * again with a width cap when a line has nowhere to go beside the box: the
   * legend gives up width rather than have the caption land on it. Undefined
   * (or a callback returning it) — there is nothing to flow around.
   */
  obstacle?: (widthCap?: number) => LayoutRect | undefined;
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
  /** Height of the whole block: the lines plus the vertical padding. */
  height: number;
  lines: CaptionLine[];
  /** Width the widest line is missing in the gap the obstacle left it (0 — everything fits). */
  shortfall: number;
}

function captionShown(options: CaptionOptions | undefined): boolean {
  return Boolean(options?.text) && options?.enabled !== false;
}

function captionMetrics(
  role: 'title' | 'subtitle',
  options: CaptionOptions | undefined,
  theme: ThemeContext,
  zone: 'top' | 'bottom',
): { fontSize: number; padding: Required<Padding> } | undefined {
  if (!captionShown(options) || !options) return undefined;
  const config = ROLES[role];
  // only the plot-facing side is padded by default — above the plot that is the
  // bottom of the caption, below it the top
  const gap = options.spacing ?? config.plotGap;
  const fallback: Required<Padding> = { top: zone === 'bottom' ? gap : 0, right: 0, bottom: zone === 'bottom' ? 0 : gap, left: 0 };
  return { fontSize: options.fontSize ?? themeFont(theme, config.fontStep), padding: resolvePadding(options.padding, fallback) };
}

/** Whether anything will be drawn at all — lets callers skip preparing the layout context. */
export function hasCaptions(title: CaptionOptions | undefined, subtitle: CaptionOptions | undefined): boolean {
  return captionShown(title) || captionShown(subtitle);
}

/**
 * Room for a line spanning [top, bottom): the full width, or the wider side of
 * the obstacle. `gap` is the width that side really has — undefined for a line
 * clear of the obstacle. What a line cannot fit in its gap is what the obstacle
 * is later asked to give up.
 */
function lineSpan(full: Span, top: number, bottom: number, obstacle: LayoutRect | undefined): { span: Span; gap?: number } {
  if (!obstacle || bottom <= obstacle.y || top >= obstacle.y + obstacle.height) return { span: full };
  const before: Span = { left: full.left, right: Math.min(full.right, obstacle.x - OBSTACLE_GAP) };
  const after: Span = { left: Math.max(full.left, obstacle.x + obstacle.width + OBSTACLE_GAP), right: full.right };
  const widest = after.right - after.left > before.right - before.left ? after : before;
  const gap = Math.max(0, widest.right - widest.left);
  // the obstacle leaves no usable gap — keep the full width instead of squeezing the text to nothing
  return { span: gap > 0 ? widest : full, gap };
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
  spanAt: (index: number) => { span: Span; gap?: number },
  wrap: boolean,
): Array<{ text: string; span: Span; gap?: number }> {
  const lines: Array<{ text: string; span: Span; gap?: number }> = [];
  for (const paragraph of text.split('\n')) {
    let room = spanAt(lines.length);
    let current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (wrap && current && measureText(candidate, font) > room.span.right - room.span.left) {
        lines.push({ text: current, ...room });
        room = spanAt(lines.length);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push({ text: current, ...room });
  }
  return lines;
}

/**
 * Lays a caption out inside `full`, starting at `blockTop`. The text sits inside
 * its `padding`: the horizontal sides narrow the room the lines wrap within, the
 * vertical ones grow the block. Returns undefined for a disabled or empty caption.
 */
function layoutCaption(
  role: 'title' | 'subtitle',
  options: CaptionOptions | undefined,
  theme: ThemeContext,
  full: Span,
  blockTop: number,
  zone: 'top' | 'bottom',
  context: CaptionLayoutContext,
  obstacle: LayoutRect | undefined,
): CaptionPlacement | undefined {
  const metrics = captionMetrics(role, options, theme, zone);
  if (!metrics || !options) return undefined;
  const config = ROLES[role];
  const { fontSize, padding } = metrics;
  const fontWeight = options.fontWeight !== undefined ? String(options.fontWeight) : config.fontWeight;
  const font = `${fontWeight} ${fontSize}px ${options.fontFamily ?? theme.fontFamily}`;
  const step = fontSize * LINE_HEIGHT;
  const textTop = blockTop + padding.top;
  const room: Span = { left: full.left + padding.left, right: full.right - padding.right };
  const spanAt = (index: number) => lineSpan(room, textTop + index * step, textTop + index * step + fontSize, obstacle);

  const align = options.textAlign ?? 'center';
  let shortfall = 0;
  const lines = wrapText(options.text ?? '', font, context.measureText, spanAt, options.wrap !== false).map(
    ({ text, span, gap }, index) => {
      // a line the obstacle narrowed: what it still does not fit is what the obstacle has to give up
      if (gap !== undefined) shortfall = Math.max(shortfall, context.measureText(text, font) - gap);
      return {
        text,
        align,
        x: align === 'left' ? span.left : align === 'right' ? span.right : (span.left + span.right) / 2,
        y: textTop + index * step,
      };
    },
  );
  return { role, options, fontSize, height: padding.top + fontSize + (lines.length - 1) * step + padding.bottom, lines, shortfall };
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
 * above the subtitle in both zones, the caption padding faces the plot). Long
 * text wraps within the available width, flowing around `context.obstacle`.
 * Returns the placements plus the space consumed from each edge, chart padding
 * excluded.
 *
 * When a line has nowhere to go beside the obstacle, the obstacle is asked to
 * fit into a narrower width and the whole layout is taken again — a floating
 * legend gives up the room the caption is missing instead of being written
 * over. It gives up no more than half the width: past that its own labels
 * would be the ones with nowhere to go.
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

  const place = (obstacle: LayoutRect | undefined) => {
    const placements: CaptionPlacement[] = [];
    let top = 0;
    for (const [role, options] of zone('top')) {
      const placement = layoutCaption(role, options, theme, full, padding.top + top, 'top', context, obstacle);
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
        const placement = layoutCaption(role, options, theme, full, cursor, 'bottom', context, obstacle);
        if (!placement) continue;
        bottomPlacements.push(placement);
        cursor += placement.height;
      }
      const settled = cursor - start === bottom;
      bottom = cursor - start;
      if (settled) break;
    }

    const all = [...placements, ...bottomPlacements];
    return { placements: all, top, bottom, shortfall: all.reduce((max, one) => Math.max(max, one.shortfall), 0) };
  };

  let obstacle = context.obstacle?.();
  let result = place(obstacle);
  const floor = (full.right - full.left) * MIN_OBSTACLE_SHARE;
  for (let pass = 1; pass < FIT_PASSES && obstacle && result.shortfall > 0; pass++) {
    const cap = obstacle.width - Math.ceil(result.shortfall);
    if (cap < floor) break;
    const narrowed = context.obstacle?.(cap);
    if (!narrowed || narrowed.width >= obstacle.width) {
      // the obstacle is as narrow as it goes — leave it the way it was
      context.obstacle?.();
      break;
    }
    obstacle = narrowed;
    result = place(obstacle);
  }
  return result;
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
