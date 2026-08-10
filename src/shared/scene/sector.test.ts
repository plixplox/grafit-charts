import { Sector } from './sector';
import { describe, expect, it } from 'vitest';

interface Call {
  method: string;
  args: unknown[];
}

/** Minimal 2D context recorder: enough for scene nodes, which only issue draw calls. */
function recorder(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const methods = [
    'save',
    'restore',
    'translate',
    'scale',
    'beginPath',
    'arc',
    'moveTo',
    'lineTo',
    'quadraticCurveTo',
    'closePath',
    'fill',
    'stroke',
  ];
  const ctx = { globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1 } as unknown as Record<string, unknown>;
  for (const method of methods) ctx[method] = (...args: unknown[]) => calls.push({ method, args });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

/** Draws the sector and answers whether anything was filled. */
function fills(sector: Partial<Sector>): boolean {
  const { ctx, calls } = recorder();
  const node = new Sector();
  Object.assign(node, { centerX: 200, centerY: 200, outerRadius: 150, fill: '#f00', ...sector });
  node.render(ctx);
  return calls.some((call) => call.method === 'fill');
}

describe('Sector', () => {
  it('draws a sliver the spacing would otherwise swallow', () => {
    // 0.02 rad at r=150 is a 3px sliver, and the 6px gaps around it ask for more
    // angle than it has: the gap gives way, so the sector is still drawn
    expect(fills({ startAngle: 0, endAngle: 0.02, edgeInset: 3 })).toBe(true);
  });

  it('draws a sliver of a ring too', () => {
    expect(fills({ startAngle: 0, endAngle: 0.02, innerRadius: 90, edgeInset: 3 })).toBe(true);
  });

  it('rounds a sliver without turning it inside out', () => {
    expect(fills({ startAngle: 0, endAngle: 0.02, innerRadius: 90, edgeInset: 3, cornerRadius: 8 })).toBe(true);
  });

  it('draws nothing when there is no angle at all', () => {
    expect(fills({ startAngle: 1, endAngle: 1 })).toBe(false);
    expect(fills({ startAngle: 1, endAngle: 2, outerRadius: 0 })).toBe(false);
  });

  it('keeps hover and paint in step: what is picked is what is drawn', () => {
    const node = new Sector();
    Object.assign(node, { centerX: 200, centerY: 200, outerRadius: 150, startAngle: 0, endAngle: 0.02, edgeInset: 3, fill: '#f00' });
    // a point just inside the sector, at mid angle
    const mid = 0.01;
    const x = 200 + Math.sin(mid) * 120;
    const y = 200 - Math.cos(mid) * 120;
    expect(node.containsPoint(x, y)).toBe(true);
    const { ctx, calls } = recorder();
    node.render(ctx);
    expect(calls.some((call) => call.method === 'fill')).toBe(true);
  });
});
