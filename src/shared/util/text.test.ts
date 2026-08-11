import { ellipsize } from './text';
import { describe, expect, it } from 'vitest';

/** 10 px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

describe('ellipsize', () => {
  it('leaves a text that fits alone', () => {
    expect(ellipsize('Revenue', 'font', 70, measureText)).toBe('Revenue');
  });

  it('counts the mark into the room it has', () => {
    // 5 characters of room: 3 of the word plus the two dots of the mark
    expect(ellipsize('Revenue', 'font', 50, measureText)).toBe('Rev..');
  });

  it('takes the mark it is given', () => {
    // the single glyph costs one character of the five
    expect(ellipsize('Revenue', 'font', 50, measureText, '…')).toBe('Reve…');
  });

  it('falls back to the mark alone when not even one character fits with it', () => {
    expect(ellipsize('Revenue', 'font', 20, measureText)).toBe('..');
  });

  it('draws nothing when even the mark would overrun', () => {
    expect(ellipsize('Revenue', 'font', 15, measureText)).toBe('');
    expect(ellipsize('Revenue', 'font', 0, measureText)).toBe('');
  });
});
