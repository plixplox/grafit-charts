import { NumberAxis, type NumberAxisOptions } from './index';
import type { AxisEnv, AxisPosition, LayoutRect, ThemeContext } from '@/shared/kernel';
import { describe, expect, it } from 'vitest';

const theme: ThemeContext = {
  backgroundColor: '#fff',
  foregroundColor: '#000',
  mutedColor: '#888',
  axisColor: '#ddd',
  fontFamily: 'sans-serif',
  fontSize: 11,
  strokeWidth: 2,
  positiveColor: '#21a06c',
  negativeColor: '#e5484d',
  palette: { fills: [], strokes: [], sequential: ['#dbe6ff', '#1d4fd7'] },
  axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
};

const plot: LayoutRect = { x: 40, y: 20, width: 400, height: 300 };
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function axis(options: Partial<NumberAxisOptions>, position: AxisPosition, domain: number[] = [0, 100]): NumberAxis {
  const env: AxisEnv = { position, theme };
  const instance = new NumberAxis({ type: 'number', ...options }, env);
  instance.setDomain(domain);
  instance.layout(plot);
  return instance;
}

describe('labels hanging over the ends of the axis', () => {
  it('asks for half of the outermost label on a horizontal axis', () => {
    // the domain ends sit on the plot edges, so the first and last labels are half outside
    const overflow = axis({}, 'bottom').labelOverflow(measureText, plot);
    expect(overflow.left).toBeCloseTo(measureText('0') / 2, 6);
    expect(overflow.right).toBeCloseTo(measureText('100') / 2, 6);
    expect(overflow.top).toBe(0);
    expect(overflow.bottom).toBe(0);
  });

  it('asks for half a line at the top and the bottom of a vertical axis', () => {
    const overflow = axis({ label: { fontSize: 12 } }, 'left').labelOverflow(measureText, plot);
    expect(overflow.top).toBeCloseTo(6, 6);
    expect(overflow.bottom).toBeCloseTo(6, 6);
    // along the axis the label zone measure() reserved already holds them
    expect(overflow.left).toBe(0);
    expect(overflow.right).toBe(0);
  });

  it('counts the formatted label, not the raw value', () => {
    const overflow = axis({ label: { formatter: ({ value }) => `${value} units` } }, 'bottom').labelOverflow(measureText, plot);
    expect(overflow.right).toBeCloseTo(measureText('100 units') / 2, 6);
  });

  it('asks for nothing while the ticks stay clear of the ends', () => {
    // a domain that no tick lands on: the outermost labels sit inside the plot
    const overflow = axis({ min: -13, max: 117, nice: false }, 'bottom').labelOverflow(measureText, plot);
    expect(overflow.left).toBe(0);
    expect(overflow.right).toBe(0);
  });
});
