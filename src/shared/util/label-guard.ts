/**
 * Value labels crowd each other long before they run out of chart: two bars of
 * similar height put their numbers side by side and the text collides. A
 * series with label.avoidOverlap on asks this guard for room and skips the
 * labels it cannot get.
 */
import { textBounds, type Bounds } from './overflow';
import type { LabelBox, LabelGuard, MeasureText } from '@/shared/kernel';

/** Labels this close to one another already read as touching. */
const LABEL_GAP = 2;

function collides(a: Bounds, b: Bounds, gap: number): boolean {
  return a.left - gap < b.right && a.right + gap > b.left && a.top - gap < b.bottom && a.bottom + gap > b.top;
}

export class LabelPlacements implements LabelGuard {
  private readonly taken: Bounds[] = [];

  constructor(
    private readonly measureText: MeasureText,
    private readonly gap: number = LABEL_GAP,
  ) {}

  /** Takes the box for the label when it is free; false — the spot is occupied. */
  admits(box: LabelBox): boolean {
    const width = box.width ?? this.measureText(box.text, box.font);
    const bounds = textBounds(box.x, box.y, width, box.height ?? box.fontSize, box.align, box.baseline);
    if (this.taken.some((other) => collides(other, bounds, this.gap))) return false;
    this.taken.push(bounds);
    return true;
  }
}
