import { SceneNode } from './node';

export class Group extends SceneNode {
  private readonly children: SceneNode[] = [];

  append(...nodes: SceneNode[]): this {
    this.children.push(...nodes);
    return this;
  }

  clear(): void {
    this.children.length = 0;
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const ordered = [...this.children].sort((a, b) => a.zIndex - b.zIndex);
    for (const child of ordered) {
      child.render(ctx);
    }
  }

  override containsPoint(x: number, y: number): boolean {
    return this.children.some((child) => child.containsPoint(x - this.translationX, y - this.translationY));
  }
}
