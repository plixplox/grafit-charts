/**
 * Base scene-graph node. Minimal phase-0 set:
 * visibility, opacity, z-order, translation, drawing, hit-test.
 */
export abstract class SceneNode {
  visible = true;
  opacity = 1;
  zIndex = 0;
  translationX = 0;
  translationY = 0;

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || this.opacity <= 0) return;
    ctx.save();
    if (this.translationX !== 0 || this.translationY !== 0) {
      ctx.translate(this.translationX, this.translationY);
    }
    ctx.globalAlpha *= this.opacity;
    this.draw(ctx);
    ctx.restore();
  }

  protected abstract draw(ctx: CanvasRenderingContext2D): void;

  containsPoint(_x: number, _y: number): boolean {
    return false;
  }
}
