import { SceneNode } from './node';
import type { ColorValue, Pixels } from '@/shared/options';

export type MarkerShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'cross' | 'plus';

/** Data point marker. `size` is the diameter of the bounding area in pixels. */
export class Marker extends SceneNode {
  x = 0;
  y = 0;
  size: Pixels = 6;
  shape: MarkerShape = 'circle';
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth: Pixels = 1;

  protected draw(ctx: CanvasRenderingContext2D): void {
    const r = this.size / 2;
    const { x, y } = this;
    ctx.beginPath();
    switch (this.shape) {
      case 'circle':
        ctx.arc(x, y, r, 0, Math.PI * 2);
        break;
      case 'square':
        ctx.rect(x - r, y - r, this.size, this.size);
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

  override containsPoint(px: number, py: number): boolean {
    const dx = px - this.translationX - this.x;
    const dy = py - this.translationY - this.y;
    const r = this.size / 2;
    return dx * dx + dy * dy <= r * r;
  }
}
