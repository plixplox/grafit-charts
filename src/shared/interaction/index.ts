export interface PointerModifiers {
  alt: boolean;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
}

export type ChartPointerEvent =
  | { type: 'move' | 'leave' | 'click' | 'dblclick'; x: number; y: number }
  | { type: 'contextmenu'; x: number; y: number; preventDefault: () => void }
  | { type: 'wheel'; x: number; y: number; deltaY: number; preventDefault: () => void }
  | { type: 'pinch'; x: number; y: number; scale: number }
  | {
      type: 'drag-start' | 'drag-move' | 'drag-end';
      x: number;
      y: number;
      dx: number;
      dy: number;
      modifiers: PointerModifiers;
    };

const DRAG_THRESHOLD = 3;

/**
 * Normalizes DOM pointer events into chart events.
 * Coordinates are in the chart's system (px from the canvas top-left corner).
 * Regions with subscriber priorities — in later phases if needed.
 */
export class InteractionManager {
  private readonly disposers: Array<() => void> = [];
  private down: { x: number; y: number; id: number } | undefined;
  private last: { x: number; y: number } | undefined;
  private dragging = false;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance: number | undefined;

  constructor(
    private readonly element: HTMLElement,
    private readonly handler: (event: ChartPointerEvent) => void,
  ) {
    this.listen('pointermove', (e) => this.onMove(e));
    this.listen('pointerleave', (e) => this.emitAt('leave', e));
    this.listen('pointerdown', (e) => {
      const { x, y } = this.coords(e);
      this.pointers.set(e.pointerId, { x, y });
      if (this.pointers.size === 2) {
        this.pinchDistance = this.pointerDistance();
        this.down = undefined;
        this.dragging = false;
        return;
      }
      this.down = { x, y, id: e.pointerId };
      this.last = { x, y };
    });
    this.listen('pointerup', (e) => this.onUp(e));
    this.listen('pointercancel', (e) => {
      this.pointers.delete(e.pointerId);
      this.pinchDistance = undefined;
      this.down = undefined;
      this.dragging = false;
    });
    this.listen('dblclick', (e) => this.emitAt('dblclick', e));
    this.listen('contextmenu', (e) => {
      const { x, y } = this.coords(e);
      this.handler({ type: 'contextmenu', x, y, preventDefault: () => e.preventDefault() });
    });
    this.listen('wheel', (e) => {
      const { x, y } = this.coords(e);
      this.handler({ type: 'wheel', x, y, deltaY: e.deltaY, preventDefault: () => e.preventDefault() });
    });
  }

  private onMove(e: PointerEvent): void {
    const { x, y } = this.coords(e);
    if (this.pointers.has(e.pointerId)) {
      this.pointers.set(e.pointerId, { x, y });
    }
    // pinch: two active pointers
    if (this.pointers.size === 2 && this.pinchDistance !== undefined) {
      const distance = this.pointerDistance();
      if (distance > 0 && this.pinchDistance > 0) {
        const points = [...this.pointers.values()];
        const center = {
          x: ((points[0]?.x ?? 0) + (points[1]?.x ?? 0)) / 2,
          y: ((points[0]?.y ?? 0) + (points[1]?.y ?? 0)) / 2,
        };
        this.handler({ type: 'pinch', x: center.x, y: center.y, scale: distance / this.pinchDistance });
      }
      this.pinchDistance = distance;
      return;
    }
    if (this.down) {
      const dx = x - (this.last?.x ?? x);
      const dy = y - (this.last?.y ?? y);
      const modifiers = modifiersOf(e);
      if (!this.dragging && Math.hypot(x - this.down.x, y - this.down.y) > DRAG_THRESHOLD) {
        this.dragging = true;
        this.element.setPointerCapture?.(this.down.id);
        this.handler({ type: 'drag-start', x: this.down.x, y: this.down.y, dx: 0, dy: 0, modifiers });
      }
      if (this.dragging) {
        this.handler({ type: 'drag-move', x, y, dx, dy, modifiers });
      }
      this.last = { x, y };
      return;
    }
    this.handler({ type: 'move', x, y });
  }

  private pointerDistance(): number {
    const points = [...this.pointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot((points[0]?.x ?? 0) - (points[1]?.x ?? 0), (points[0]?.y ?? 0) - (points[1]?.y ?? 0));
  }

  private onUp(e: PointerEvent): void {
    const { x, y } = this.coords(e);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = undefined;
    if (this.dragging) {
      this.handler({ type: 'drag-end', x, y, dx: 0, dy: 0, modifiers: modifiersOf(e) });
    } else if (this.down) {
      this.handler({ type: 'click', x, y });
    }
    this.down = undefined;
    this.dragging = false;
  }

  private emitAt(type: 'leave' | 'dblclick', e: PointerEvent | MouseEvent): void {
    const { x, y } = this.coords(e);
    this.handler({ type, x, y });
  }

  private coords(e: MouseEvent): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private listen<K extends keyof HTMLElementEventMap>(name: K, listener: (e: HTMLElementEventMap[K]) => void): void {
    this.element.addEventListener(name, listener as EventListener, { passive: false });
    this.disposers.push(() => this.element.removeEventListener(name, listener as EventListener));
  }

  destroy(): void {
    this.disposers.forEach((dispose) => dispose());
    this.disposers.length = 0;
  }
}

function modifiersOf(e: MouseEvent): PointerModifiers {
  return { alt: e.altKey, ctrl: e.ctrlKey, shift: e.shiftKey, meta: e.metaKey };
}
