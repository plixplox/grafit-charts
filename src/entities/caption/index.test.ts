import { layoutCaptions, type CaptionOptions } from './index';
import type { ThemeContext } from '@/shared/kernel';
import { describe, expect, it } from 'vitest';

const theme: ThemeContext = {
  backgroundColor: '#fff',
  foregroundColor: '#000',
  mutedColor: '#888',
  fontFamily: 'sans-serif',
  palette: { fills: [], strokes: [] },
};

const padding = { top: 10, right: 20, bottom: 10, left: 20 };
/** 10px per character, whatever the font — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function layout(title: CaptionOptions | undefined, subtitle: CaptionOptions | undefined) {
  return layoutCaptions(title, subtitle, theme, 400, 300, padding, { measureText });
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

  it('skips disabled and empty captions', () => {
    const { placements, top } = layout({ text: 'Revenue', enabled: false }, { text: '' });
    expect(placements).toEqual([]);
    expect(top).toBe(0);
  });
});
