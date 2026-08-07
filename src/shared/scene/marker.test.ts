import { Marker } from './marker';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    'rect',
    'roundRect',
    'moveTo',
    'lineTo',
    'closePath',
    'fill',
    'stroke',
  ];
  const ctx = { globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1 } as unknown as Record<string, unknown>;
  for (const method of methods) ctx[method] = (...args: unknown[]) => calls.push({ method, args });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const called = (calls: Call[], method: string) => calls.filter((call) => call.method === method);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Marker', () => {
  it('rounds a square when cornerRadius is set', () => {
    const { ctx, calls } = recorder();
    const marker = new Marker();
    Object.assign(marker, { shape: 'square', x: 20, y: 10, size: 8, cornerRadius: 3, fill: '#f00' });
    marker.render(ctx);
    expect(called(calls, 'rect')).toHaveLength(0);
    expect(called(calls, 'roundRect')[0]?.args).toEqual([16, 6, 8, 8, 3]);
  });

  it('keeps a sharp square without a corner radius', () => {
    const { ctx, calls } = recorder();
    const marker = new Marker();
    Object.assign(marker, { shape: 'square', x: 20, y: 10, size: 8, fill: '#f00' });
    marker.render(ctx);
    expect(called(calls, 'roundRect')).toHaveLength(0);
    expect(called(calls, 'rect')[0]?.args).toEqual([16, 6, 8, 8]);
  });

  it('scales a custom path from its viewBox into the marker box', () => {
    class FakePath2D {
      constructor(readonly d: string) {}
    }
    vi.stubGlobal('Path2D', FakePath2D);
    const { ctx, calls } = recorder();
    const marker = new Marker();
    Object.assign(marker, { path: 'M0 0 L24 24', x: 50, y: 30, size: 12, fill: '#f00', stroke: '#00f', strokeWidth: 2 });
    marker.render(ctx);

    // top-left corner of the 12px box, then viewBox 24 → 12
    expect(called(calls, 'translate')[0]?.args).toEqual([44, 24]);
    expect(called(calls, 'scale')[0]?.args).toEqual([0.5, 0.5]);
    const fill = called(calls, 'fill')[0];
    expect((fill?.args[0] as FakePath2D).d).toBe('M0 0 L24 24');
    // the stroke width is given in screen pixels — the scaling is undone
    expect(ctx.lineWidth).toBe(4);
  });

  it('caches the parsed path across renders', () => {
    const parsed = vi.fn();
    class FakePath2D {
      constructor(d: string) {
        parsed(d);
      }
    }
    vi.stubGlobal('Path2D', FakePath2D);
    const marker = new Marker();
    Object.assign(marker, { path: 'M0 0 L1 1 Z', fill: '#f00' });
    marker.render(recorder().ctx);
    marker.render(recorder().ctx);
    expect(parsed).toHaveBeenCalledTimes(1);
  });

  it('draws nothing for a path outside a DOM canvas', () => {
    vi.stubGlobal('Path2D', undefined);
    const { ctx, calls } = recorder();
    const marker = new Marker();
    Object.assign(marker, { path: 'M0 0 L5 5 Z', fill: '#f00' });
    marker.render(ctx);
    expect(called(calls, 'fill')).toHaveLength(0);
  });
});
