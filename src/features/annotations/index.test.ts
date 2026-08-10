import { renderAnnotations, type AnnotationOptions } from './index';
import type { ThemeContext } from '@/shared/kernel';
import type { Datum } from '@/shared/options';
import { LinearScale } from '@/shared/scale';
import { Group } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const theme = {
  backgroundColor: '#fff',
  foregroundColor: '#111',
  mutedColor: '#888',
  axisColor: '#ddd',
  fontFamily: 'sans-serif',
  fontSize: 11,
  strokeWidth: 1,
  positiveColor: '#21a06c',
  negativeColor: '#e5484d',
  palette: { fills: ['#436ff4'], strokes: ['#2f56cc'], sequential: ['#dbe6ff', '#1d4fd7'] },
  axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
} as unknown as ThemeContext;

const plot = { x: 0, y: 0, width: 400, height: 300 };
/** 0–40 down the left, 0–100 across: a mean of 20 lands halfway. */
const yScale = new LinearScale([0, 40], [plot.y + plot.height, plot.y]);
const xScale = new LinearScale([0, 100], [plot.x, plot.x + plot.width]);
const data: Datum[] = [{ ms: 10 }, { ms: 20 }, { ms: 30 }];

/** Canvas calls the annotations make, with their arguments. */
function draw(annotations: AnnotationOptions[], rows: Datum[] = data): Array<[string, ...unknown[]]> {
  const layer = new Group();
  renderAnnotations(annotations, { layer, plot, xScale, yScale, theme, data: rows });
  const calls: Array<[string, ...unknown[]]> = [];
  const state: Record<string | symbol, unknown> = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 0 });
      return (...args: unknown[]) => calls.push([String(prop), ...args]);
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  layer.render(ctx);
  // save/restore is the group's own bookkeeping, drawn or not
  return calls.filter(([name]) => name !== 'save' && name !== 'restore');
}

const lineTos = (calls: Array<[string, ...unknown[]]>): unknown[][] =>
  calls.filter(([name]) => name === 'lineTo').map(([, ...args]) => args);
const texts = (calls: Array<[string, ...unknown[]]>): unknown[] => calls.filter(([name]) => name === 'fillText').map(([, text]) => text);

describe('a reference line the data decides', () => {
  it('sits on the mean of its field', () => {
    const calls = draw([{ type: 'horizontal-line', value: { stat: 'mean', field: 'ms' } }]);
    // mean 20 of a 0–40 axis: halfway up a 300px plot
    expect(lineTos(calls)).toEqual([[plot.width, 150]]);
  });

  it('sits on a percentile just the same, across the other axis', () => {
    const calls = draw([{ type: 'vertical-line', value: { stat: 'percentile', percentile: 100, field: 'ms' } }]);
    // p100 is 30 on a 0–100 axis: 30% across 400px
    expect(lineTos(calls)).toEqual([[120, plot.height]]);
  });

  it('tells its label the number it landed on', () => {
    const calls = draw([
      {
        type: 'horizontal-line',
        value: { stat: 'mean', field: 'ms' },
        label: { formatter: (value) => `mean ${value.toFixed(1)} ms` },
      },
    ]);
    expect(texts(calls)).toEqual(['mean 20.0 ms']);
  });

  it('keeps a plain label as written', () => {
    const calls = draw([{ type: 'horizontal-line', value: { stat: 'max', field: 'ms' }, label: { text: 'peak' } }]);
    expect(texts(calls)).toEqual(['peak']);
  });

  it('draws nothing when the statistic has nothing to work with', () => {
    expect(draw([{ type: 'horizontal-line', value: { stat: 'mean', field: 'missing' } }])).toEqual([]);
    expect(draw([{ type: 'horizontal-line', value: { stat: 'mean', field: 'ms' } }, ...[]], [])).toEqual([]);
  });

  it('leaves a plain value exactly where it was put', () => {
    expect(lineTos(draw([{ type: 'horizontal-line', value: 10 }]))).toEqual([[plot.width, 225]]);
  });
});

describe('a band between two statistics', () => {
  it('spans from one to the other', () => {
    const calls = draw([
      {
        type: 'range',
        axis: 'y',
        range: [
          { stat: 'min', field: 'ms' },
          { stat: 'max', field: 'ms' },
        ],
      },
    ]);
    // 10..30 of a 0–40 axis: from y=75 down to y=225, 150px tall
    const rect = calls.find(([name]) => name === 'rect' || name === 'fillRect');
    expect(rect?.slice(1)).toEqual([plot.x, 75, plot.width, 150]);
  });

  it('is left undrawn when an end cannot be computed', () => {
    expect(draw([{ type: 'range', axis: 'y', range: [{ stat: 'min', field: 'nope' }, 30] }])).toEqual([]);
  });
});
