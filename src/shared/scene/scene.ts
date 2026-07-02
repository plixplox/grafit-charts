import { Group } from './group';
import type { CanvasFactory, SceneCanvas } from './types';

/**
 * Scene with named layers on a single canvas: each layer is a root group,
 * layer order = order of first access (z-order). The scene graph is retained,
 * so any change simply redraws the whole canvas once per frame.
 */
export class Scene {
  private readonly canvas: SceneCanvas;
  private readonly layers = new Map<string, Group>();
  private dirty = true;

  constructor(
    factory: CanvasFactory,
    private logicalWidth: number,
    private logicalHeight: number,
  ) {
    this.canvas = factory(logicalWidth, logicalHeight);
  }

  get width(): number {
    return this.logicalWidth;
  }

  get height(): number {
    return this.logicalHeight;
  }

  /** Root group of the layer; created on first access. */
  layer(name: string): Group {
    let root = this.layers.get(name);
    if (!root) {
      root = new Group();
      this.layers.set(name, root);
    }
    return root;
  }

  /** Marks the scene for redraw (layer names are accepted for call-site clarity; the canvas is redrawn whole). */
  markDirty(..._names: string[]): void {
    this.dirty = true;
  }

  measureText(text: string, font: string): number {
    const ctx = this.canvas.context;
    ctx.save();
    ctx.font = font;
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  }

  resize(width: number, height: number): void {
    this.logicalWidth = width;
    this.logicalHeight = height;
    this.canvas.resize(width, height);
    this.dirty = true;
  }

  /** Redraws the canvas if anything changed since the last render. */
  render(): void {
    if (!this.dirty) return;
    this.dirty = false;
    const { context: ctx, pixelRatio } = this.canvas;
    ctx.save();
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const root of this.layers.values()) root.render(ctx);
    ctx.restore();
  }

  /** Rendered image source (PNG export). */
  composite(draw: (image: unknown) => void): void {
    this.render();
    draw(this.canvas.image);
  }

  destroy(): void {
    this.canvas.destroy();
    this.layers.clear();
  }
}
