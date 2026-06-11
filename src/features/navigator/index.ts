import type { LayoutRect, ThemeContext, ZoomWindow } from '@/shared/kernel';
import type { Pixels, Switchable } from '@/shared/options';
import { Group, Path, Rect } from '@/shared/scene';

export interface NavigatorOptions extends Switchable {
  height?: Pixels;
  /** Mini chart of the first series inside the bar (enabled by default). */
  miniChart?: Switchable;
  /** Initial window (0..1). */
  min?: number;
  max?: number;
}

export const NAVIGATOR_HEIGHT = 24;
const HANDLE_WIDTH = 6;
const HIT_SLOP = 4;

export type NavigatorHit = 'handle-start' | 'handle-end' | 'window' | 'track';

/** Navigator bar: track + window + handles. Rendering and hit-testing. */
export class Navigator {
  private rect: LayoutRect = { x: 0, y: 0, width: 0, height: 0 };

  constructor(private readonly options: NavigatorOptions | undefined) {}

  get enabled(): boolean {
    return this.options?.enabled === true;
  }

  get height(): number {
    return this.options?.height ?? NAVIGATOR_HEIGHT;
  }

  get initialWindow(): ZoomWindow | undefined {
    if (this.options?.min === undefined && this.options?.max === undefined) return undefined;
    return [this.options?.min ?? 0, this.options?.max ?? 1];
  }

  render(layer: Group, rect: LayoutRect, window: ZoomWindow, theme: ThemeContext, miniValues?: number[]): void {
    this.rect = rect;
    const track = new Rect();
    track.x = rect.x;
    track.y = rect.y;
    track.width = rect.width;
    track.height = rect.height;
    track.fill = theme.mutedColor;
    track.opacity = 0.15;
    track.cornerRadius = 4;
    layer.append(track);

    if (this.options?.miniChart?.enabled !== false && miniValues && miniValues.length > 1) {
      const valid = miniValues.filter((value) => Number.isFinite(value));
      const min = Math.min(...valid);
      const max = Math.max(...valid);
      const span = max - min || 1;
      const mini = new Path();
      const pad = 3;
      const innerHeight = rect.height - pad * 2;
      miniValues.forEach((value, index) => {
        const px = rect.x + (index / (miniValues.length - 1)) * rect.width;
        const py = rect.y + pad + (1 - (value - min) / span) * innerHeight;
        if (index === 0) mini.moveTo(px, py);
        else mini.lineTo(px, py);
      });
      mini.stroke = theme.mutedColor;
      mini.strokeWidth = 1;
      mini.opacity = 0.8;
      layer.append(mini);
    }

    const winX = rect.x + rect.width * window[0];
    const winWidth = rect.width * (window[1] - window[0]);
    const win = new Rect();
    win.x = winX;
    win.y = rect.y;
    win.width = winWidth;
    win.height = rect.height;
    win.fill = theme.palette.fills[0] ?? '#436ff4';
    win.opacity = 0.25;
    win.cornerRadius = 4;
    layer.append(win);

    for (const edge of [winX, winX + winWidth]) {
      const handle = new Rect();
      handle.x = edge - HANDLE_WIDTH / 2;
      handle.y = rect.y + 2;
      handle.width = HANDLE_WIDTH;
      handle.height = rect.height - 4;
      handle.cornerRadius = 2;
      handle.fill = theme.palette.fills[0] ?? '#436ff4';
      layer.append(handle);
    }
  }

  hitTest(x: number, y: number, window: ZoomWindow): NavigatorHit | undefined {
    const { rect } = this;
    if (y < rect.y - HIT_SLOP || y > rect.y + rect.height + HIT_SLOP) return undefined;
    if (x < rect.x - HIT_SLOP || x > rect.x + rect.width + HIT_SLOP) return undefined;
    const winX0 = rect.x + rect.width * window[0];
    const winX1 = rect.x + rect.width * window[1];
    if (Math.abs(x - winX0) <= HANDLE_WIDTH / 2 + HIT_SLOP) return 'handle-start';
    if (Math.abs(x - winX1) <= HANDLE_WIDTH / 2 + HIT_SLOP) return 'handle-end';
    if (x >= winX0 && x <= winX1) return 'window';
    return 'track';
  }

  /** Converts an X coordinate to a fraction of the track (0..1). */
  ratioAt(x: number): number {
    if (this.rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (x - this.rect.x) / this.rect.width));
  }
}

/** Feature API for widgets (via registry.getFeature('navigator')). */
export const navigatorApi = {
  create: (options: NavigatorOptions | undefined): Navigator => new Navigator(options),
};
export type NavigatorApi = typeof navigatorApi;

export const navigatorModule = { kind: 'feature', name: 'navigator', api: navigatorApi } as const;
