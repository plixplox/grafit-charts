import { ColorScale } from './color-scale';
import { describe, expect, it } from 'vitest';

describe('ColorScale', () => {
  it('domain edges yield stop colors in rgb()', () => {
    const scale = new ColorScale();
    expect(scale.convert(0)).toBe('rgb(67, 111, 244)');
    expect(scale.convert(1)).toBe('rgb(244, 93, 138)');
  });

  it('midpoint is the per-channel average, rounded', () => {
    const scale = new ColorScale([0, 1], ['#000000', '#ff0000']);
    expect(scale.convert(0.5)).toBe('rgb(128, 0, 0)');
  });

  it('values outside the domain are clamped', () => {
    const scale = new ColorScale();
    expect(scale.convert(-10)).toBe(scale.convert(0));
    expect(scale.convert(10)).toBe(scale.convert(1));
  });

  it('three stops: piecewise interpolation hits the middle stop', () => {
    const scale = new ColorScale([0, 10], ['#000', '#888', '#fff']);
    expect(scale.convert(5)).toBe('rgb(136, 136, 136)');
    expect(scale.convert(10)).toBe('rgb(255, 255, 255)');
  });

  it('degenerate domain yields the first color', () => {
    const scale = new ColorScale([5, 5], ['#436ff4', '#f45d8a']);
    expect(scale.convert(123)).toBe('rgb(67, 111, 244)');
  });

  it('fewer than two colors falls back to a black-to-white gradient', () => {
    const scale = new ColorScale([0, 1], ['#123456']);
    expect(scale.convert(0)).toBe('rgb(0, 0, 0)');
    expect(scale.convert(1)).toBe('rgb(255, 255, 255)');
  });
});
