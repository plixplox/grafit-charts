/**
 * Abstraction over canvas: the scene-graph does not know whether it is DOM or a Node environment.
 * Implementations: DomCanvas (browser), @napi-rs/canvas adapter (snapshot tests, later).
 */
export interface SceneCanvas {
  readonly width: number;
  readonly height: number;
  /** Device scale (devicePixelRatio in the browser, 1 in Node). */
  readonly pixelRatio: number;
  readonly context: CanvasRenderingContext2D;
  /** Source for drawImage (PNG export; HTMLCanvasElement etc.). */
  readonly image: unknown;
  resize(width: number, height: number): void;
  destroy(): void;
}

export type CanvasFactory = (width: number, height: number) => SceneCanvas;
