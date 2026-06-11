import type { ThemeContext, TooltipContentData } from '@/shared/kernel';
import type { Pixels, Switchable } from '@/shared/options';

export interface TooltipOptions extends Switchable {
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
}

const OFFSET = 12;

/**
 * HTML tooltip (DOM, not canvas): an absolutely positioned element
 * inside the chart container.
 */
export class HtmlTooltip {
  private readonly element: HTMLDivElement;

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

  show(content: TooltipContentData, x: number, y: number, theme: ThemeContext): void {
    this.element.style.background = theme.backgroundColor;
    this.element.style.color = theme.foregroundColor;
    this.element.style.border = `1px solid ${theme.mutedColor}`;
    this.element.replaceChildren(...this.buildContent(content, theme));
    this.element.style.display = 'block';

    // position after rendering the content, clamping to the container bounds
    const { offsetWidth, offsetHeight } = this.element;
    const maxX = this.container.clientWidth - offsetWidth - 2;
    const maxY = this.container.clientHeight - offsetHeight - 2;
    let left = x + OFFSET;
    if (left > maxX) left = x - offsetWidth - OFFSET;
    let top = y - offsetHeight - OFFSET;
    if (top < 0) top = y + OFFSET;
    this.element.style.left = `${Math.max(2, Math.min(left, maxX))}px`;
    this.element.style.top = `${Math.max(2, Math.min(top, maxY))}px`;
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  destroy(): void {
    this.element.remove();
  }

  private buildContent(content: TooltipContentData, theme: ThemeContext): Node[] {
    const nodes: Node[] = [];
    if (content.heading) {
      const heading = document.createElement('div');
      heading.textContent = content.heading;
      heading.style.fontWeight = '600';
      nodes.push(heading);
    }
    for (const row of content.rows) {
      const line = document.createElement('div');
      line.style.display = 'flex';
      line.style.alignItems = 'center';
      line.style.gap = '6px';
      if (row.color) {
        const swatch = document.createElement('span');
        Object.assign(swatch.style, {
          width: '8px',
          height: '8px',
          borderRadius: '2px',
          background: row.color,
          display: 'inline-block',
        } satisfies Partial<CSSStyleDeclaration>);
        line.appendChild(swatch);
      }
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
}

/** Feature API for widgets (via registry.getFeature('tooltip')). */
export const tooltipApi = {
  create: (container: HTMLElement): HtmlTooltip => new HtmlTooltip(container),
};
export type TooltipApi = typeof tooltipApi;

export const tooltipModule = { kind: 'feature', name: 'tooltip', api: tooltipApi } as const;
