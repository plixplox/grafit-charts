import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { ThemeContext } from '@/shared/kernel';
import type { Switchable } from '@/shared/options';

export interface ContextMenuItem {
  label: string;
  action: () => void;
}

export interface ContextMenuOptions extends Switchable {
  /** Extra items appended after the standard ones. */
  extraItems?: ContextMenuItem[];
}

/** DOM menu shown on right click. */
export class HtmlContextMenu {
  private element: HTMLDivElement | undefined;
  private readonly closeListener = () => this.hide();

  constructor(private readonly container: HTMLElement) {}

  show(items: ContextMenuItem[], x: number, y: number, theme: ThemeContext): void {
    this.hide();
    if (items.length === 0) return;
    const menu = document.createElement('div');
    Object.assign(menu.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: '20',
      background: theme.backgroundColor,
      color: theme.foregroundColor,
      border: `1px solid ${theme.axisColor}`,
      borderRadius: `${theme.cornerRadius ?? 6}px`,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      font: `${themeFont(theme, FONT_STEP.subtitle)}px ${theme.fontFamily}`,
      padding: '4px',
      minWidth: '160px',
    } satisfies Partial<CSSStyleDeclaration>);
    // a solid highlight rather than a tint: alpha over an unknown surface is unreliable
    const hover = theme.palette.fills[0] ?? theme.foregroundColor;
    for (const item of items) {
      const row = document.createElement('div');
      row.textContent = item.label;
      Object.assign(row.style, {
        padding: '6px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
      } satisfies Partial<CSSStyleDeclaration>);
      row.addEventListener('mouseenter', () => {
        row.style.background = hover;
        row.style.color = theme.backgroundColor;
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = 'transparent';
        row.style.color = '';
      });
      row.addEventListener('click', () => {
        this.hide();
        item.action();
      });
      menu.appendChild(row);
    }
    this.container.appendChild(menu);
    this.element = menu;
    // close on any click outside the menu (after the current event)
    setTimeout(() => document.addEventListener('pointerdown', this.closeListener, { once: true }), 0);
  }

  hide(): void {
    this.element?.remove();
    this.element = undefined;
  }

  destroy(): void {
    this.hide();
    document.removeEventListener('pointerdown', this.closeListener);
  }
}

/** Feature API (via registry.getFeature('context-menu')). */
export const contextMenuApi = {
  create: (container: HTMLElement): HtmlContextMenu => new HtmlContextMenu(container),
};
export type ContextMenuApi = typeof contextMenuApi;

export const contextMenuModule = { kind: 'feature', name: 'context-menu', api: contextMenuApi } as const;
