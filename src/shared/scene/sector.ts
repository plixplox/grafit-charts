import { SceneNode } from './node';
import type { ColorValue, Pixels } from '@/shared/options';

/**
 * However narrow a sector is, the gaps beside it never take more than this
 * share of its angular width: a sliver is drawn as a sliver rather than
 * swallowed by its own spacing.
 */
const MAX_GAP_SHARE = 0.4;

/**
 * Annular sector. Angles in radians, 0 points up (12 o'clock),
 * increasing clockwise.
 */
export class Sector extends SceneNode {
  centerX = 0;
  centerY = 0;
  innerRadius = 0;
  outerRadius = 0;
  startAngle = 0;
  endAngle = 0;
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth: Pixels = 1;
  cornerRadius: Pixels = 0;
  /**
   * Parallel inward offset of the radial edges (px): the gap between
   * sectors ends up the same width along its entire length.
   */
  edgeInset: Pixels = 0;

  /** Converts a "polar" angle to a canvas angle (canvas 0 points right). */
  private static toCanvasAngle(angle: number): number {
    return angle - Math.PI / 2;
  }

  private point(angle: number, radius: number): [number, number] {
    return [this.centerX + Math.sin(angle) * radius, this.centerY - Math.cos(angle) * radius];
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const span = this.endAngle - this.startAngle;
    if (span <= 0 || this.outerRadius <= 0) return;
    const R = this.outerRadius;
    const Rin = this.innerRadius;
    // A gap of a constant width covers a wider angle the closer to the centre it
    // gets, and on a narrow sector it covers the sector itself. The gap is the
    // one that gives way: it is capped at MAX_GAP_SHARE of the span where the
    // sector is thinnest, so whatever is left over is still drawn.
    const thinnest = Rin > 0 ? Rin : R;
    const inset = Math.min(this.edgeInset, thinnest * Math.sin((span * MAX_GAP_SHARE) / 2));
    // angular offset of the edge at a given radius: r·sin(φ) = inset ⇒ the edge is
    // a straight line parallel to the radial line at distance inset
    const ofs = (radius: number) => (inset > 0 && radius > 0 ? Math.asin(Math.min(1, inset / radius)) : 0);

    const half = span / 2;
    const mid = this.startAngle + half;
    // convergence apex of the offset edges (for pie and narrow rings)
    const apexRadius = inset > 0 ? inset / Math.max(Math.sin(half), 1e-4) : 0;
    const isRing = Rin > 0 && apexRadius < Rin;
    const s0 = this.startAngle;
    const s1 = this.endAngle;
    const A = Sector.toCanvasAngle;
    // rounding is bounded by the sector both ways: half its radial depth, and
    // half its width — a narrow sector rounds to a lozenge, never inside out
    const halfWidth = R * Math.sin((span - 2 * ofs(R)) / 2);
    const r = Math.min(this.cornerRadius, (R - (isRing ? Rin : apexRadius)) / 2, halfWidth);

    ctx.beginPath();
    if (r > 0.5) {
      const phiOuter = Math.min(r / R, (span - 2 * ofs(R)) / 2);
      if (isRing) {
        const phiInner = Math.min(r / Rin, (span - 2 * ofs(Rin)) / 2);
        ctx.moveTo(...this.point(s0 + ofs(Rin + r), Rin + r));
        ctx.lineTo(...this.point(s0 + ofs(R - r), R - r));
        ctx.quadraticCurveTo(...this.point(s0 + ofs(R), R), ...this.point(s0 + ofs(R) + phiOuter, R));
        ctx.arc(this.centerX, this.centerY, R, A(s0 + ofs(R) + phiOuter), A(s1 - ofs(R) - phiOuter), false);
        ctx.quadraticCurveTo(...this.point(s1 - ofs(R), R), ...this.point(s1 - ofs(R - r), R - r));
        ctx.lineTo(...this.point(s1 - ofs(Rin + r), Rin + r));
        ctx.quadraticCurveTo(...this.point(s1 - ofs(Rin), Rin), ...this.point(s1 - ofs(Rin) - phiInner, Rin));
        ctx.arc(this.centerX, this.centerY, Rin, A(s1 - ofs(Rin) - phiInner), A(s0 + ofs(Rin) + phiInner), true);
        ctx.quadraticCurveTo(...this.point(s0 + ofs(Rin), Rin), ...this.point(s0 + ofs(Rin + r), Rin + r));
      } else {
        const apex = this.point(mid, Math.max(apexRadius, Rin));
        ctx.moveTo(...apex);
        ctx.lineTo(...this.point(s0 + ofs(R - r), R - r));
        ctx.quadraticCurveTo(...this.point(s0 + ofs(R), R), ...this.point(s0 + ofs(R) + phiOuter, R));
        ctx.arc(this.centerX, this.centerY, R, A(s0 + ofs(R) + phiOuter), A(s1 - ofs(R) - phiOuter), false);
        ctx.quadraticCurveTo(...this.point(s1 - ofs(R), R), ...this.point(s1 - ofs(R - r), R - r));
        ctx.lineTo(...apex);
      }
    } else {
      if (isRing) {
        ctx.moveTo(...this.point(s0 + ofs(Rin), Rin));
        ctx.lineTo(...this.point(s0 + ofs(R), R));
        ctx.arc(this.centerX, this.centerY, R, A(s0 + ofs(R)), A(s1 - ofs(R)), false);
        ctx.lineTo(...this.point(s1 - ofs(Rin), Rin));
        ctx.arc(this.centerX, this.centerY, Rin, A(s1 - ofs(Rin)), A(s0 + ofs(Rin)), true);
      } else {
        const apex = this.point(mid, Math.max(apexRadius, Rin));
        ctx.moveTo(...apex);
        ctx.lineTo(...this.point(s0 + ofs(R), R));
        ctx.arc(this.centerX, this.centerY, R, A(s0 + ofs(R)), A(s1 - ofs(R)), false);
        ctx.lineTo(...apex);
      }
    }
    ctx.closePath();
    if (this.fill) {
      ctx.fillStyle = this.fill;
      ctx.fill();
    }
    if (this.stroke && this.strokeWidth > 0) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
  }

  override containsPoint(x: number, y: number): boolean {
    const dx = x - this.translationX - this.centerX;
    const dy = y - this.translationY - this.centerY;
    const radius = Math.hypot(dx, dy);
    if (radius < this.innerRadius || radius > this.outerRadius) return false;
    // angle in the chart's polar system (0 is up, clockwise)
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    while (angle < this.startAngle) angle += Math.PI * 2;
    while (angle - Math.PI * 2 >= this.startAngle) angle -= Math.PI * 2;
    return angle >= this.startAngle && angle <= this.endAngle;
  }
}
