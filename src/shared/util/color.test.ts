import { contrastTextColor } from './color';
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
