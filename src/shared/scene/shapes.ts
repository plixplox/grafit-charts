import { SceneNode } from './node';
import type { ColorValue, Pixels, ShadowOptions } from '@/shared/options';

/** Canvas drop shadow of a shape, in device-independent pixels. */
export interface SceneShadow {
  color: ColorValue;
  blur: Pixels;
  offsetX: Pixels;
  offsetY: Pixels;
}

const DEFAULT_SHADOW: SceneShadow = { color: 'rgba(0, 0, 0, 0.2)', blur: 8, offsetX: 0, offsetY: 2 };

/** Fills in the shadow defaults; undefined when there is nothing to draw. */
export function resolveShadow(options: ShadowOptions | undefined): SceneShadow | undefined {
  if (!options || options.enabled === false) return undefined;
  return {
    color: options.color ?? DEFAULT_SHADOW.color,
    blur: options.blur ?? DEFAULT_SHADOW.blur,
    offsetX: options.offsetX ?? DEFAULT_SHADOW.offsetX,
    offsetY: options.offsetY ?? DEFAULT_SHADOW.offsetY,
  };
}

export class Rect extends SceneNode {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth: Pixels = 1;
  cornerRadius: Pixels = 0;
  /** Cast under the shape; the stroke is drawn without it. */
  shadow?: SceneShadow;

  protected draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    if (this.cornerRadius > 0) {
      ctx.roundRect(this.x, this.y, this.width, this.height, this.cornerRadius);
    } else {
      ctx.rect(this.x, this.y, this.width, this.height);
    }
    if (this.fill) {
      if (this.shadow) {
        ctx.shadowColor = this.shadow.color;
        ctx.shadowBlur = this.shadow.blur;
        ctx.shadowOffsetX = this.shadow.offsetX;
        ctx.shadowOffsetY = this.shadow.offsetY;
      }
      ctx.fillStyle = this.fill;
      ctx.fill();
      if (this.shadow) {
        // the border and everything after it must not inherit the shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
    }
    if (this.stroke && this.strokeWidth > 0) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
  }

  override containsPoint(x: number, y: number): boolean {
    const lx = x - this.translationX;
    const ly = y - this.translationY;
    return lx >= this.x && lx <= this.x + this.width && ly >= this.y && ly <= this.y + this.height;
  }
}

export class Line extends SceneNode {
  x1 = 0;
  y1 = 0;
  x2 = 0;
  y2 = 0;
  stroke: ColorValue = '#000';
  strokeWidth: Pixels = 1;
  lineDash?: Pixels[];

  protected draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    if (this.lineDash) ctx.setLineDash(this.lineDash);
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.strokeStyle = this.stroke;
    ctx.lineWidth = this.strokeWidth;
    ctx.stroke();
  }
}

export class Text extends SceneNode {
  x = 0;
  y = 0;
  text = '';
  fill: ColorValue = '#000';
  fontSize: Pixels = 12;
  fontFamily = 'sans-serif';
  fontWeight: string | number = 'normal';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  /** Outline around letters (drawn under the fill). */
  outline?: ColorValue;
  outlineWidth: Pixels = 2;
  /** Rotation around (x, y), in degrees. */
  rotation = 0;

  protected draw(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = this.fill;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
    const paint = (x: number, y: number) => {
      if (this.outline) {
        ctx.strokeStyle = this.outline;
        ctx.lineWidth = this.outlineWidth;
        ctx.lineJoin = 'round';
        ctx.strokeText(this.text, x, y);
      }
      ctx.fillText(this.text, x, y);
    };
    if (this.rotation !== 0) {
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      paint(0, 0);
    } else {
      paint(this.x, this.y);
    }
  }
}

export class Circle extends SceneNode {
  x = 0;
  y = 0;
  radius = 0;
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth: Pixels = 1;
  lineDash?: Pixels[];

  protected draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    if (this.fill) {
      ctx.fillStyle = this.fill;
      ctx.fill();
    }
    if (this.stroke && this.strokeWidth > 0) {
      if (this.lineDash) ctx.setLineDash(this.lineDash);
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
  }
}
