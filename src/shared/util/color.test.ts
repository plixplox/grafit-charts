import { contrastTextColor, mixColors } from './color';
import { describe, expect, it } from 'vitest';

describe('contrastTextColor', () => {
  it('light background yields dark text', () => {
    expect(contrastTextColor('#fff')).toBe('#33404f');
    expect(contrastTextColor('#ffffff')).toBe('#33404f');
    expect(contrastTextColor('rgb(255, 255, 255)')).toBe('#33404f');
  });

  it('dark background yields white text', () => {
    expect(contrastTextColor('#000')).toBe('#ffffff');
    expect(contrastTextColor('rgb(0,0,0)')).toBe('#ffffff');
  });

  it('luminance threshold 150 is exclusive', () => {
    // luminance = 150·(0.299+0.587+0.114) = 150 — not greater than 150
    expect(contrastTextColor('rgb(150, 150, 150)')).toBe('#ffffff');
    expect(contrastTextColor('rgb(151, 151, 151)')).toBe('#33404f');
  });

  it('unparseable color yields white text', () => {
    expect(contrastTextColor('red')).toBe('#ffffff');
  });
});

describe('mixColors', () => {
  it('endpoints keep their color', () => {
    expect(mixColors('#3366cc', '#ffffff', 0)).toBe('#3366cc');
    expect(mixColors('#3366cc', '#ffffff', 1)).toBe('#ffffff');
  });

  it('midpoint averages every channel', () => {
    expect(mixColors('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixColors('#000', 'rgb(255, 255, 255)', 0.5)).toBe('#808080');
  });

  it('amount is clamped to 0..1', () => {
    expect(mixColors('#000000', '#ffffff', -1)).toBe('#000000');
    expect(mixColors('#000000', '#ffffff', 4)).toBe('#ffffff');
  });

  it('unparseable side leaves the color as is', () => {
    expect(mixColors('tomato', '#ffffff', 0.5)).toBe('tomato');
    expect(mixColors('#3366cc', 'tomato', 0.5)).toBe('#3366cc');
  });
});
