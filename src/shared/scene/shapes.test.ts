import { Rect, resolveShadow } from './shapes';
import { describe, expect, it } from 'vitest';

interface Call {
  method: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
}

/** Records the shadow state of the context at each paint call. */
function recorder(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const ctx = {
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save: () => {},
    restore: () => {},
    translate: () => {},
    beginPath: () => {},
    rect: () => {},
    roundRect: () => {},
  } as unknown as CanvasRenderingContext2D;
  const record = (method: string) => () =>
    calls.push({ method, shadowColor: ctx.shadowColor, shadowBlur: ctx.shadowBlur, shadowOffsetY: ctx.shadowOffsetY });
  Object.assign(ctx, { fill: record('fill'), stroke: record('stroke') });
  return { ctx, calls };
}

describe('resolveShadow', () => {
  it('fills in the defaults', () => {
    expect(resolveShadow({})).toEqual({ color: 'rgba(0, 0, 0, 0.2)', blur: 8, offsetX: 0, offsetY: 2 });
  });

  it('keeps the given values', () => {
    expect(resolveShadow({ color: '#000', blur: 2, offsetX: 1, offsetY: 4 })).toEqual({
      color: '#000',
      blur: 2,
      offsetX: 1,
      offsetY: 4,
    });
  });

  it('is absent when missing or switched off', () => {
    expect(resolveShadow(undefined)).toBeUndefined();
    expect(resolveShadow({ enabled: false, blur: 12 })).toBeUndefined();
  });
});

describe('Rect', () => {
  it('casts the shadow under the fill only', () => {
    const { ctx, calls } = recorder();
    const rect = new Rect();
    Object.assign(rect, {
      width: 40,
      height: 20,
      fill: '#fff',
      stroke: '#000',
      shadow: { color: '#123456', blur: 6, offsetX: 0, offsetY: 3 },
    });
    rect.render(ctx);
    expect(calls[0]).toEqual({ method: 'fill', shadowColor: '#123456', shadowBlur: 6, shadowOffsetY: 3 });
    expect(calls[1]).toEqual({ method: 'stroke', shadowColor: 'transparent', shadowBlur: 0, shadowOffsetY: 0 });
  });

  it('leaves the context alone without a shadow', () => {
    const { ctx, calls } = recorder();
    const rect = new Rect();
    Object.assign(rect, { width: 40, height: 20, fill: '#fff' });
    rect.render(ctx);
    expect(calls[0]?.shadowColor).toBe('');
  });
});
