import { Group } from './group';
import type { CanvasFactory, SceneCanvas } from './types';

interface SceneLayer {
  canvas: SceneCanvas;
  root: Group;
  dirty: boolean;
}

/**
 * Scene with named layers: each layer is its own canvas,
 * only layers marked dirty are redrawn. Layer order = order of
 * first access (z-order).
 */
export class Scene {
  private readonly layers = new Map<string, SceneLayer>();
  private measureCanvas: SceneCanvas | undefined;

  constructor(
    private readonly factory: CanvasFactory,
    private logicalWidth: number,
    private logicalHeight: number,
  ) {}

  get width(): number {
    return this.logicalWidth;
  }

  get height(): number {
    return this.logicalHeight;
  }

  /** Root group of the layer; the canvas is created on first access. */
  layer(name: string): Group {
    let layer = this.layers.get(name);
    if (!layer) {
      layer = { canvas: this.factory(this.logicalWidth, this.logicalHeight), root: new Group(), dirty: true };
      this.layers.set(name, layer);
    }
    return layer.root;
  }

  /** Marks layers for redraw (all when called without arguments). */
  markDirty(...names: string[]): void {
    if (names.length === 0) {
      for (const layer of this.layers.values()) layer.dirty = true;
      return;
    }
    for (const name of names) {
      const layer = this.layers.get(name);
      if (layer) layer.dirty = true;
    }
  }

  measureText(text: string, font: string): number {
    this.measureCanvas ??= this.factory(1, 1);
    const ctx = this.measureCanvas.context;
    ctx.save();
    ctx.font = font;
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  }

  resize(width: number, height: number): void {
    this.logicalWidth = width;
    this.logicalHeight = height;
    for (const layer of this.layers.values()) {
      layer.canvas.resize(width, height);
      layer.dirty = true;
    }
  }

  /** Redraws dirty layers. */
  render(): void {
    for (const layer of this.layers.values()) {
      if (!layer.dirty) continue;
      layer.dirty = false;
      const { context: ctx, pixelRatio } = layer.canvas;
      ctx.save();
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      layer.root.render(ctx);
      ctx.restore();
    }
  }

  /** Layer composition (PNG export): the callback receives each layer's image source in order. */
  composite(draw: (image: unknown) => void): void {
    this.render();
    for (const layer of this.layers.values()) {
      draw(layer.canvas.image);
    }
  }

  destroy(): void {
    for (const layer of this.layers.values()) layer.canvas.destroy();
    this.layers.clear();
    this.measureCanvas?.destroy();
  }
}
