import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { ThemeContext, TooltipContentData } from '@/shared/kernel';
import { paddingToCss, type ColorValue, type FontOptions, type PaddingValue, type Pixels, type Switchable } from '@/shared/options';

export interface TooltipOptions extends Switchable, FontOptions {
  /** single — the nearest node; shared — values of all series in the category. */
  mode?: 'single' | 'shared';
  /**
   * Capture area: a number — radius in px (30), 'exact' — only direct hits
   * on a node, 'nearest' — the nearest node from anywhere in the plot area.
   */
  range?: Pixels | 'exact' | 'nearest';
  /** Positioning: at the node edge (by default), at the node center, or at the pointer. */
  position?: {
    anchorTo?: 'node' | 'center' | 'pointer';
    xOffset?: Pixels;
    yOffset?: Pixels;
  };
  /**
   * Where the tooltip element lives. 'chart' (by default) — inside the chart
   * container, positioned in its coordinates and kept within its bounds.
   * 'body' — in document.body with position: fixed, kept within the viewport,
   * so ancestors with overflow: hidden don't clip it. An element — appended
   * there and positioned like 'body' (an app's own overlay layer).
   */
  container?: 'chart' | 'body' | HTMLElement;
  /** CSS z-index of the tooltip element: 10 inside the chart, 1000 outside it. */
  zIndex?: number;
  /** Container background (theme background by default). */
  background?: ColorValue;
  /** Border color (theme muted color by default). */
  borderColor?: ColorValue;
  /** Border width; 0 removes the border. */
  borderWidth?: Pixels;
  borderRadius?: Pixels;
  /** CSS box-shadow; false removes the shadow. */
  shadow?: string | false;
  /**
   * Inner padding of the container: `8`, `[8, 12]`, `[8, 12, 4, 0]`,
   * `{ top, right, bottom, left }` — or a raw CSS string.
   */
  padding?: PaddingValue | string;
}

const OFFSET = 12;

/**
 * HTML tooltip (DOM, not canvas): an absolutely positioned element inside the
 * chart container — or, with `container: 'body'` or an element, a fixed one
 * outside it that the chart's clipping ancestors can't cut.
 */
export class HtmlTooltip {
  private readonly element: HTMLDivElement;
  /** Lives outside the chart container, positioned against the viewport. */
  private detached = false;
  /** A fixed tooltip would stay put while the page slides under it, so scrolling hides it. */
  private readonly onViewportChange = (): void => this.hide();

  constructor(private readonly container: HTMLElement) {
    this.element = document.createElement('div');
    Object.assign(this.element.style, {
      position: 'absolute',
      zIndex: '10',
      pointerEvents: 'none',
      borderRadius: '6px',
      padding: '7px 10px',
      font: '12px system-ui, sans-serif',
      lineHeight: '1.5',
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(this.element);
  }

  show(content: TooltipContentData, x: number, y: number, theme: ThemeContext, options?: TooltipOptions): void {
    this.attach(options?.container === 'body' ? document.body : options?.container instanceof HTMLElement ? options.container : undefined);
    this.element.style.zIndex = String(options?.zIndex ?? (this.detached ? 1000 : 10));
    this.element.style.background = options?.background ?? theme.backgroundColor;
    this.element.style.color = options?.color ?? theme.foregroundColor;
    const borderWidth = options?.borderWidth ?? 1;
    this.element.style.border = borderWidth <= 0 ? 'none' : `${borderWidth}px solid ${options?.borderColor ?? theme.mutedColor}`;
    this.element.style.borderRadius = `${options?.borderRadius ?? theme.cornerRadius ?? 6}px`;
    this.element.style.boxShadow = options?.shadow === false ? 'none' : (options?.shadow ?? '0 2px 8px rgba(0, 0, 0, 0.25)');
    if (options?.padding !== undefined) {
      this.element.style.padding = typeof options.padding === 'string' ? options.padding : paddingToCss(options.padding);
    }
    this.element.style.fontSize = `${options?.fontSize ?? themeFont(theme, FONT_STEP.heading)}px`;
    this.element.style.fontFamily = options?.fontFamily ?? theme.fontFamily;
    // out of the container nothing is inherited from it, so the defaults are spelled out
    if (options?.fontWeight !== undefined || this.detached) this.element.style.fontWeight = String(options?.fontWeight ?? 'normal');
    if (options?.fontStyle !== undefined || this.detached) this.element.style.fontStyle = options?.fontStyle ?? 'normal';
    this.element.replaceChildren(...this.buildContent(content, theme));
    this.element.style.display = 'block';

    // position after rendering the content, clamping to the container bounds —
    // or, outside it, to the viewport, with the node carried over into viewport coordinates
    const { offsetWidth: width, offsetHeight: height } = this.element;
    let nodeX = x;
    let nodeY = y;
    let boundsWidth = this.container.clientWidth;
    let boundsHeight = this.container.clientHeight;
    if (this.detached) {
      const rect = this.container.getBoundingClientRect();
      nodeX += rect.left + this.container.clientLeft;
      nodeY += rect.top + this.container.clientTop;
      boundsWidth = document.documentElement.clientWidth;
      boundsHeight = document.documentElement.clientHeight;
    }
    // by the node either way — right of it and above, flipping where the bounds run out
    const maxX = boundsWidth - width - 2;
    const maxY = boundsHeight - height - 2;
    let left = nodeX + OFFSET;
    if (left > maxX) left = nodeX - width - OFFSET;
    let top = nodeY - height - OFFSET;
    if (top < 0) top = nodeY + OFFSET;
    this.element.style.left = `${Math.max(2, Math.min(left, maxX))}px`;
    this.element.style.top = `${Math.max(2, Math.min(top, maxY))}px`;
  }

  /** Whether it is on screen — a tooltip already shown is one worth re-reading when the data moves. */
  get visible(): boolean {
    return this.element.style.display !== 'none';
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  destroy(): void {
    this.attach(undefined);
    this.element.remove();
  }

  /** Moves the element to its host: the chart container (undefined) or an element outside it. */
  private attach(host: HTMLElement | undefined): void {
    const parent = host ?? this.container;
    if (this.element.parentElement === parent) return;
    parent.appendChild(this.element);
    this.element.style.position = host ? 'fixed' : 'absolute';
    if (host && !this.detached) {
      window.addEventListener('scroll', this.onViewportChange, { capture: true, passive: true });
      window.addEventListener('resize', this.onViewportChange);
    } else if (!host && this.detached) {
      window.removeEventListener('scroll', this.onViewportChange, { capture: true });
      window.removeEventListener('resize', this.onViewportChange);
    }
    this.detached = host !== undefined;
  }

  private buildContent(content: TooltipContentData, theme: ThemeContext): Node[] {
    const nodes: Node[] = [];
    const heading = typeof content.heading === 'string' ? { text: content.heading } : content.heading;
    if (heading?.text) {
      const line = document.createElement('div');
      line.style.fontWeight = '600';
      if (heading.color) {
        line.style.display = 'flex';
        line.style.alignItems = 'center';
        line.style.gap = '6px';
        const text = document.createElement('span');
        text.textContent = heading.text;
        line.append(this.buildSwatch(heading.color), text);
      } else {
        line.textContent = heading.text;
      }
      nodes.push(line);
    }
    const hasRowMarkers = content.rows.some((row) => row.color);
    for (const row of content.rows) {
      const line = document.createElement('div');
      line.style.display = 'flex';
      line.style.alignItems = 'center';
      line.style.gap = '6px';
      // a transparent swatch reserves the marker slot so mixed rows stay aligned
      if (hasRowMarkers) line.appendChild(this.buildSwatch(row.color));
      const label = document.createElement('span');
      label.textContent = `${row.label}:`;
      label.style.color = theme.mutedColor;
      const value = document.createElement('span');
      value.textContent = row.value;
      value.style.fontWeight = '600';
      line.append(label, value);
      nodes.push(line);
    }
    return nodes;
  }

  private buildSwatch(color?: ColorValue): HTMLSpanElement {
    const swatch = document.createElement('span');
    Object.assign(swatch.style, {
      width: '8px',
      height: '8px',
      borderRadius: '2px',
      background: color ?? 'transparent',
      display: 'inline-block',
      flexShrink: '0',
    } satisfies Partial<CSSStyleDeclaration>);
    return swatch;
  }
}

/** Feature API for widgets (via registry.getFeature('tooltip')). */
export const tooltipApi = {
  create: (container: HTMLElement): HtmlTooltip => new HtmlTooltip(container),
};
export type TooltipApi = typeof tooltipApi;

export const tooltipModule = { kind: 'feature', name: 'tooltip', api: tooltipApi } as const;
