import type { SceneCanvas } from './types';

/** Browser implementation of SceneCanvas with HDPI scaling. */
export class DomCanvas implements SceneCanvas {
  readonly element: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly pixelRatio: number;
  private logicalWidth: number;
  private logicalHeight: number;

  constructor(width: number, height: number) {
    this.element = document.createElement('canvas');
    this.pixelRatio = globalThis.devicePixelRatio ?? 1;
    this.logicalWidth = width;
    this.logicalHeight = height;
    const ctx = this.element.getContext('2d');
    if (!ctx) throw new Error('grafit: failed to acquire 2d canvas context');
    this.context = ctx;
    this.applySize();
  }

  get width(): number {
    return this.logicalWidth;
  }

  get height(): number {
    return this.logicalHeight;
  }

  get image(): unknown {
    return this.element;
  }

  resize(width: number, height: number): void {
    this.logicalWidth = width;
    this.logicalHeight = height;
    this.applySize();
  }

  destroy(): void {
    this.element.remove();
  }

  private applySize(): void {
    this.element.width = Math.round(this.logicalWidth * this.pixelRatio);
    this.element.height = Math.round(this.logicalHeight * this.pixelRatio);
    this.element.style.width = `${this.logicalWidth}px`;
    this.element.style.height = `${this.logicalHeight}px`;
    this.element.style.display = 'block';
  }
}
