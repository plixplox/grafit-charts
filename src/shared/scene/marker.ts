import { SceneNode } from './node';
import type { ColorValue, Pixels } from '@/shared/options';

export type MarkerShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'cross' | 'plus';

/** Default side of the square SVG `path` coordinates are expected in. */
export const MARKER_PATH_VIEWBOX = 24;

const PATH_CACHE_LIMIT = 64;
const pathCache = new Map<string, Path2D>();

/** Parses SVG path data once per unique string; undefined outside a DOM canvas. */
function parsePath(d: string): Path2D | undefined {
  const cached = pathCache.get(d);
  if (cached) return cached;
  if (typeof Path2D === 'undefined') return undefined;
  const path = new Path2D(d);
  // a styler could generate paths per datum — keep the cache from growing forever
  if (pathCache.size >= PATH_CACHE_LIMIT) pathCache.clear();
  pathCache.set(d, path);
  return path;
}

/** Data point marker. `size` is the diameter of the bounding area in pixels. */
export class Marker extends SceneNode {
  x = 0;
  y = 0;
  size: Pixels = 6;
  shape: MarkerShape = 'circle';
  /** Custom shape as SVG path data; wins over `shape`. */
  path?: string;
  /** Side of the square `path` coordinates live in; scaled to `size`. */
  viewBox: number = MARKER_PATH_VIEWBOX;
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth: Pixels = 1;
  /** 'square' only: corner rounding. */
  cornerRadius: Pixels = 0;

  protected draw(ctx: CanvasRenderingContext2D): void {
    if (this.path !== undefined) {
      this.drawPath(ctx, this.path);
      return;
    }
    const r = this.size / 2;
    const { x, y } = this;
    ctx.beginPath();
    switch (this.shape) {
      case 'circle':
        ctx.arc(x, y, r, 0, Math.PI * 2);
        break;
      case 'square':
        if (this.cornerRadius > 0) ctx.roundRect(x - r, y - r, this.size, this.size, this.cornerRadius);
        else ctx.rect(x - r, y - r, this.size, this.size);
        break;
      case 'diamond':
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        break;
      case 'triangle':
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.lineTo(x - r, y + r);
        ctx.closePath();
        break;
      case 'cross':
        ctx.moveTo(x - r, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.moveTo(x + r, y - r);
        ctx.lineTo(x - r, y + r);
        break;
      case 'plus':
        ctx.moveTo(x, y - r);
        ctx.lineTo(x, y + r);
        ctx.moveTo(x - r, y);
        ctx.lineTo(x + r, y);
        break;
    }
    const strokeOnly = this.shape === 'cross' || this.shape === 'plus';
    if (this.fill && !strokeOnly) {
      ctx.fillStyle = this.fill;
      ctx.fill();
    }
    const stroke = this.stroke ?? (strokeOnly ? this.fill : undefined);
    if (stroke && this.strokeWidth > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
  }

  /** Draws the custom path scaled from its viewBox into the marker box, centred on (x, y). */
  private drawPath(ctx: CanvasRenderingContext2D, d: string): void {
    const path = parsePath(d);
    if (!path) return;
    const scale = this.size / (this.viewBox > 0 ? this.viewBox : MARKER_PATH_VIEWBOX);
    ctx.save();
    ctx.translate(this.x - this.size / 2, this.y - this.size / 2);
    ctx.scale(scale, scale);
    if (this.fill) {
      ctx.fillStyle = this.fill;
      ctx.fill(path);
    }
    if (this.stroke && this.strokeWidth > 0) {
      ctx.strokeStyle = this.stroke;
      // the stroke is specified in screen pixels, so undo the viewBox scaling
      ctx.lineWidth = this.strokeWidth / scale;
      ctx.stroke(path);
    }
    ctx.restore();
  }

  override containsPoint(px: number, py: number): boolean {
    const dx = px - this.translationX - this.x;
    const dy = py - this.translationY - this.y;
    const r = this.size / 2;
    return dx * dx + dy * dy <= r * r;
  }
}
