import { SceneNode } from './node';
import type { ColorValue, Pixels } from '@/shared/options';

type PathCommand =
  | { op: 'move'; x: number; y: number }
  | { op: 'line'; x: number; y: number }
  | { op: 'curve'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { op: 'close' };

/** Arbitrary path with a command buffer. */
export class Path extends SceneNode {
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth: Pixels = 1;
  lineDash?: Pixels[];
  lineJoin: CanvasLineJoin = 'round';
  lineCap: CanvasLineCap = 'round';

  private readonly commands: PathCommand[] = [];

  moveTo(x: number, y: number): this {
    this.commands.push({ op: 'move', x, y });
    return this;
  }

  lineTo(x: number, y: number): this {
    this.commands.push({ op: 'line', x, y });
    return this;
  }

  curveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): this {
    this.commands.push({ op: 'curve', cp1x, cp1y, cp2x, cp2y, x, y });
    return this;
  }

  closePath(): this {
    this.commands.push({ op: 'close' });
    return this;
  }

  clear(): this {
    this.commands.length = 0;
    return this;
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    if (this.commands.length === 0) return;
    ctx.beginPath();
    for (const command of this.commands) {
      switch (command.op) {
        case 'move':
          ctx.moveTo(command.x, command.y);
          break;
        case 'line':
          ctx.lineTo(command.x, command.y);
          break;
        case 'curve':
          ctx.bezierCurveTo(command.cp1x, command.cp1y, command.cp2x, command.cp2y, command.x, command.y);
          break;
        case 'close':
          ctx.closePath();
          break;
      }
    }
    if (this.fill) {
      ctx.fillStyle = this.fill;
      ctx.fill();
    }
    if (this.stroke && this.strokeWidth > 0) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.lineJoin = this.lineJoin;
      ctx.lineCap = this.lineCap;
      if (this.lineDash) ctx.setLineDash(this.lineDash);
      ctx.stroke();
    }
  }
}
