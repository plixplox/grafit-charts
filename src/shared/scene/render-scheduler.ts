/**
 * Coalesces redraw requests: no matter how many times it is asked,
 * the render runs once in the next frame (rAF; a microtask in
 * non-browser environments).
 */
export class RenderScheduler {
  private pending: Promise<void> | undefined;

  constructor(private readonly render: () => void) {}

  schedule(): Promise<void> {
    this.pending ??= new Promise<void>((resolve) => {
      const flush = () => {
        this.pending = undefined;
        this.render();
        resolve();
      };
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(flush);
      } else {
        queueMicrotask(flush);
      }
    });
    return this.pending;
  }

  /** Promise of the currently scheduled render (for waitForUpdate). */
  get settled(): Promise<void> {
    return this.pending ?? Promise.resolve();
  }
}
