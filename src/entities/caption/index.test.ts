import { layoutCaptions, type CaptionOptions } from './index';
import type { ThemeContext } from '@/shared/kernel';
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

const padding = { top: 10, right: 20, bottom: 10, left: 20 };
/** 10px per character, whatever the font — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function layout(
  title: CaptionOptions | undefined,
  subtitle: CaptionOptions | undefined,
  obstacle?: { x: number; y: number; width: number; height: number },
) {
  return layoutCaptions(title, subtitle, theme, 400, 300, padding, { measureText, obstacle });
}

describe('layoutCaptions', () => {
  it('keeps a fitting caption on one line, centred in the chart width', () => {
    const { placements, top, bottom } = layout({ text: 'Traffic' }, undefined);
    expect(placements[0]?.lines).toEqual([{ text: 'Traffic', x: 200, y: 10, align: 'center' }]);
    expect(top).toBe(17 + 8);
    expect(bottom).toBe(0);
  });

  it('wraps a caption that overflows the available width', () => {
    // 360px of room, 10px per character — 36 characters per line
    const { placements, top } = layout({ text: 'Site traffic by acquisition channel over the last twelve months' }, undefined);
    const lines = placements[0]?.lines ?? [];
    expect(lines.map((line) => line.text)).toEqual(['Site traffic by acquisition channel', 'over the last twelve months']);
    for (const line of lines) expect(measureText(line.text)).toBeLessThanOrEqual(360);
    // second line sits a line-height below the first, and the block grew by the same amount
    expect(lines[1]?.y).toBe(10 + 17 * 1.25);
    expect(top).toBe(17 + 17 * 1.25 + 8);
  });

  it('honours explicit line breaks even with wrapping off', () => {
    const { placements } = layout({ text: 'Revenue\n2024', wrap: false, textAlign: 'left' }, undefined);
    expect(placements[0]?.lines.map((line) => line.text)).toEqual(['Revenue', '2024']);
  });

  it('leaves an overflowing caption on one line when wrapping is off', () => {
    const { placements } = layout({ text: 'Site traffic by acquisition channel over the last twelve months', wrap: false }, undefined);
    expect(placements[0]?.lines).toHaveLength(1);
  });

  it('flows lines around an obstacle in the top-right corner', () => {
    // legend box: x 280..380, y 10..50 — lines level with it get the 250px gap on its left
    const obstacle = { x: 280, y: 10, width: 100, height: 40 };
    const { placements } = layout(
      { text: 'Site traffic by acquisition channel over the last twelve months', textAlign: 'left' },
      undefined,
      obstacle,
    );
    const lines = placements[0]?.lines ?? [];
    expect(lines.map((line) => line.text)).toEqual(['Site traffic by', 'acquisition channel over', 'the last twelve months']);
    // the first two lines overlap the legend vertically and stop before it
    for (const line of lines.slice(0, 2)) expect(line.x + measureText(line.text)).toBeLessThanOrEqual(obstacle.x);
    expect(lines[2]?.y).toBeGreaterThanOrEqual(obstacle.y + obstacle.height);
  });

  it('centres a line level with the obstacle inside the remaining gap', () => {
    const { placements } = layout({ text: 'Traffic' }, undefined, { x: 280, y: 10, width: 100, height: 40 });
    // gap is 20..270, so the centre moves left from 200 to 145
    expect(placements[0]?.lines[0]?.x).toBe(145);
  });

  it('picks the wider side when the obstacle sits on the left', () => {
    const { placements } = layout({ text: 'Traffic', textAlign: 'left' }, undefined, { x: 20, y: 10, width: 100, height: 40 });
    expect(placements[0]?.lines[0]?.x).toBe(130);
  });

  it('falls back to the full width when the obstacle leaves no gap', () => {
    const { placements } = layout({ text: 'Traffic', textAlign: 'left' }, undefined, { x: 0, y: 0, width: 400, height: 40 });
    expect(placements[0]?.lines[0]?.x).toBe(20);
  });

  it('stacks the title above the subtitle and reports the consumed height', () => {
    const { placements, top } = layout({ text: 'Revenue', spacing: 4 }, { text: 'in thousands', spacing: 12 });
    expect(placements.map((placement) => placement.role)).toEqual(['title', 'subtitle']);
    expect(placements[1]?.lines[0]?.y).toBe(10 + 17 + 4);
    expect(top).toBe(17 + 4 + 13 + 12);
  });

  it('grows the bottom zone upwards as its captions wrap', () => {
    const text = 'Site traffic by acquisition channel over the last twelve months';
    const { placements, bottom } = layout(undefined, { text, position: 'bottom' });
    const lines = placements[0]?.lines ?? [];
    expect(lines).toHaveLength(2);
    // spacing leads the text in the bottom zone, and the block ends at the padding edge
    expect(bottom).toBe(8 + 13 + 13 * 1.25);
    expect(lines[0]?.y).toBe(300 - 10 - bottom + 8);
    expect((lines[1]?.y ?? 0) + 13).toBeLessThanOrEqual(300 - padding.bottom);
  });

  it('flows a bottom caption around an obstacle pinned to the bottom-right', () => {
    const text = 'Site traffic by acquisition channel over the last twelve months';
    const plain = layout(undefined, { text, position: 'bottom' });
    const flowed = layout(undefined, { text, position: 'bottom' }, { x: 280, y: 250, width: 100, height: 40 });
    // squeezed into the left gap, the same text needs an extra line
    expect(flowed.placements[0]?.lines.length).toBeGreaterThan(plain.placements[0]?.lines.length ?? 0);
    expect(flowed.bottom).toBeGreaterThan(plain.bottom);
    for (const line of flowed.placements[0]?.lines ?? []) {
      const overlapsLegend = line.y < 290 && line.y + 13 > 250;
      // centred lines: x is the middle of the line
      if (overlapsLegend) expect(line.x + measureText(line.text) / 2).toBeLessThanOrEqual(280);
    }
  });

  it('skips disabled and empty captions', () => {
    const { placements, top } = layout({ text: 'Revenue', enabled: false }, { text: '' });
    expect(placements).toEqual([]);
    expect(top).toBe(0);
  });
});
