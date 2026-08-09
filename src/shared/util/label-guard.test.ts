import { LabelPlacements } from './label-guard';
import type { LabelBox } from '@/shared/kernel';
import { describe, expect, it } from 'vitest';

/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function box(text: string, x: number, y: number): LabelBox {
  return { text, x, y, align: 'center', baseline: 'middle', fontSize: 10, font: 'normal 10px sans-serif' };
}

describe('room the value labels take', () => {
  it('gives the spot to the label that asked first', () => {
    const guard = new LabelPlacements(measureText);
    expect(guard.admits(box('1000', 100, 50))).toBe(true);
    // 40px wide around x=100 → 80…120; the next box starts inside it
    expect(guard.admits(box('2000', 130, 50))).toBe(false);
  });

  it('lets through labels that clear each other', () => {
    const guard = new LabelPlacements(measureText);
    expect(guard.admits(box('1000', 100, 50))).toBe(true);
    expect(guard.admits(box('2000', 145, 50))).toBe(true);
  });

  it('counts rows apart as free, however close the columns are', () => {
    const guard = new LabelPlacements(measureText);
    expect(guard.admits(box('1000', 100, 50))).toBe(true);
    expect(guard.admits(box('2000', 100, 80))).toBe(true);
  });

  it('asks for a 2px gap between neighbours', () => {
    // the first box covers 80…120; the second clears it once it starts at 122
    const guard = new LabelPlacements(measureText);
    expect(guard.admits(box('1000', 100, 50))).toBe(true);
    expect(guard.admits(box('2000', 141, 50))).toBe(false);
    expect(guard.admits(box('3000', 142, 50))).toBe(true);
  });
});
