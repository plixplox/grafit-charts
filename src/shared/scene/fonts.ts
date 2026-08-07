/**
 * Canvas text never triggers a font download by itself: `ctx.font` silently
 * falls back to a system face while the @font-face is still being fetched, so a
 * chart that switches to a not-yet-loaded family draws — and measures — with the
 * wrong one. Every family the options mention is therefore requested explicitly,
 * and the chart lays out again once the real faces arrive: text metrics decide
 * the geometry of axes, legend and labels.
 */

export interface FontsOptions {
  /**
   * Redraw the chart once a web font it uses has finished loading (on by
   * default). Turning it off keeps the very first frame as the only one — the
   * chart then draws with whatever face the browser has at that moment and
   * never asks for the missing ones, since canvas text loads no fonts on its own.
   */
  autoReload?: boolean;
}

/** Any size loads the same face; the weight does select a different one. */
const PROBE_SIZE = 16;
const BASE_WEIGHTS = ['normal', 'bold'];
/** Options nest a few levels deep at most; the cap also stops cyclic objects. */
const MAX_DEPTH = 8;

interface FontUsage {
  families: Set<string>;
  weights: Set<string>;
}

/**
 * Watches the faces a chart draws with: `request` pulls in the fonts declared
 * when the options were applied, `recheck` catches the ones the document
 * declares later on.
 */
export class FontWatcher {
  /** Families the current options draw with, normalized for comparison. */
  private families = new Set<string>();
  /** Faces already accounted for — every other loaded face is news. */
  private seen = new WeakSet<FontFace>();

  /**
   * Asks the browser for every font family the options mention and resolves when
   * they are in. `true` means a face actually arrived, i.e. the chart has to be
   * laid out and drawn again.
   */
  async request(options: unknown, ...extraFamilies: string[]): Promise<boolean> {
    const fonts = fontSet();
    if (!fonts) return false;

    const usage = collectFontUsage(options);
    for (const family of extraFamilies) usage.families.add(family);
    this.families = new Set([...usage.families].flatMap(splitFamilyList));
    // whatever the document has by now is the baseline; only later arrivals count
    this.absorbLoaded(fonts);

    // check() is false only for a declared but unloaded @font-face — exactly what
    // canvas will not fetch on its own
    const missing = probeSpecs(usage).filter((spec) => !isAvailable(fonts, spec));
    if (missing.length === 0) return false;

    // a family with no @font-face resolves to an empty list — nothing to redraw for
    const arrived = await Promise.all(
      missing.map((spec) =>
        fonts
          .load(spec)
          .then((faces) => faces.length > 0)
          .catch(() => false),
      ),
    );
    // this redraw covers them; recheck must not report the same faces again
    this.absorbLoaded(fonts);
    return arrived.includes(true);
  }

  /**
   * `true` when a face of one of our families has finished loading since the last
   * look — a font the page declared after the chart was built.
   */
  recheck(): boolean {
    const fonts = fontSet();
    if (!fonts || this.families.size === 0) return false;
    return this.absorbLoaded(fonts);
  }

  /** Marks every loaded face as seen; `true` if one of ours was new. */
  private absorbLoaded(fonts: FontFaceSet): boolean {
    let ours = false;
    fonts.forEach((face) => {
      if (face.status !== 'loaded' || this.seen.has(face)) return;
      this.seen.add(face);
      if (this.families.has(normalizeFamily(face.family))) ours = true;
    });
    return ours;
  }
}

/**
 * Calls `onLoadingDone` every time the document finishes loading a batch of
 * fonts; returns the unsubscribe.
 */
export function watchDocumentFonts(onLoadingDone: () => void): () => void {
  const fonts = fontSet();
  if (!fonts) return () => undefined;
  fonts.addEventListener('loadingdone', onLoadingDone);
  return () => fonts.removeEventListener('loadingdone', onLoadingDone);
}

/** Every `fontFamily`/`fontWeight` reachable in the options tree. */
export function collectFontUsage(value: unknown, depth = 0, usage: FontUsage = { families: new Set(), weights: new Set(BASE_WEIGHTS) }): FontUsage {
  if (depth > MAX_DEPTH || !value || typeof value !== 'object') return usage;
  if (Array.isArray(value)) {
    for (const item of value) collectFontUsage(item, depth + 1, usage);
    return usage;
  }
  // DOM nodes (options.container) and class instances are not options data
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== null && prototype !== Object.prototype) return usage;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    // datum arrays can be huge and never carry font settings
    if (key === 'data') continue;
    if (key === 'fontFamily' && typeof nested === 'string') usage.families.add(nested);
    else if (key === 'fontWeight' && (typeof nested === 'string' || typeof nested === 'number')) usage.weights.add(String(nested));
    else collectFontUsage(nested, depth + 1, usage);
  }
  return usage;
}

/** One CSS font shorthand per family/weight pair the chart can draw with. */
function probeSpecs(usage: FontUsage): string[] {
  const specs: string[] = [];
  for (const family of usage.families) {
    for (const weight of usage.weights) specs.push(`${weight} ${PROBE_SIZE}px ${family}`);
  }
  return specs;
}

/** `'Inter, sans-serif'` → `['inter', 'sans-serif']`, quotes dropped. */
function splitFamilyList(list: string): string[] {
  return list.split(',').map(normalizeFamily);
}

function normalizeFamily(family: string): string {
  return family.trim().replace(/^["']|["']$/g, '').toLowerCase();
}

function fontSet(): FontFaceSet | undefined {
  return typeof document === 'undefined' ? undefined : document.fonts;
}

function isAvailable(fonts: FontFaceSet, spec: string): boolean {
  try {
    return fonts.check(spec);
  } catch {
    // an unparsable shorthand is nothing we could load either
    return true;
  }
}
