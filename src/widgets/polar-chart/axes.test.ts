/**
 * The polar axes read their looks the way a cartesian axis does: the option
 * first, then the theme's axis tokens, then the plain colour. What the cascade
 * settles on is the contract.
 */
import { axisFont, axisLabelText, resolveAxisLine, resolveGridLine, resolveLabelStyle, resolveTitleStyle, titleInsets } from './axes';
import type { ThemeContext } from '@/shared/kernel';
import { describe, expect, it } from 'vitest';

const theme: ThemeContext = {
  backgroundColor: '#fff',
  foregroundColor: '#111',
  mutedColor: '#888',
  axisColor: '#ddd',
  fontFamily: 'sans-serif',
  fontSize: 11,
  strokeWidth: 2,
  positiveColor: '#21a06c',
  negativeColor: '#e5484d',
  palette: { fills: ['#3b82f6'], strokes: ['#1d4ed8'], sequential: ['#dbe6ff', '#1d4fd7'] },
  axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
};

const themed: ThemeContext = {
  ...theme,
  axis: { ...theme.axis, gridColor: '#eee', color: '#ccc', labelColor: '#555', labelSize: 13, titleColor: '#000', titleSize: 15 },
};

describe('web lines', () => {
  it('follow the theme switch until an option says otherwise', () => {
    expect(resolveGridLine(undefined, theme).visible).toBe(true);
    expect(resolveGridLine(undefined, { ...theme, axis: { ...theme.axis, gridLine: false } }).visible).toBe(false);
    expect(resolveGridLine({ enabled: true }, { ...theme, axis: { ...theme.axis, gridLine: false } }).visible).toBe(true);
  });

  it('take the grid colour of the theme over the muted one', () => {
    expect(resolveGridLine(undefined, theme).stroke).toBe('#888');
    expect(resolveGridLine(undefined, themed).stroke).toBe('#eee');
    expect(resolveGridLine({ stroke: '#f00' }, themed).stroke).toBe('#f00');
  });

  it('carry their own width, dash and opacity', () => {
    expect(resolveGridLine({ width: 3, lineDash: [2, 2], opacity: 0.8 }, theme)).toMatchObject({
      width: 3,
      lineDash: [2, 2],
      opacity: 0.8,
    });
    expect(resolveGridLine(undefined, theme).opacity).toBe(0.3);
    expect(resolveGridLine(undefined, theme, 0.2).opacity).toBe(0.2);
  });
});

describe('axis outlines', () => {
  it('stay off until asked for — the web already draws itself', () => {
    expect(resolveAxisLine(undefined, theme).visible).toBe(false);
    expect(resolveAxisLine({ enabled: true }, theme).visible).toBe(true);
  });

  it('take the axis colour of the theme over the plain one', () => {
    expect(resolveAxisLine({ enabled: true }, theme).stroke).toBe('#ddd');
    expect(resolveAxisLine({ enabled: true }, themed).stroke).toBe('#ccc');
  });
});

describe('labels', () => {
  it('are drawn unless switched off, in the theme label style', () => {
    expect(resolveLabelStyle(undefined, theme, 11)).toMatchObject({ visible: true, size: 11, color: '#888' });
    expect(resolveLabelStyle(undefined, themed, 11)).toMatchObject({ size: 13, color: '#555' });
    expect(resolveLabelStyle({ enabled: false }, theme, 11).visible).toBe(false);
  });

  it('read a format string, and a formatter over it', () => {
    expect(axisLabelText(1500, 0, undefined)).toBe('1500');
    // the format groups thousands with a thin space, as everywhere else in the library
    expect(axisLabelText(1500, 0, { format: ',.0f' })).toBe('1 500');
    expect(axisLabelText(1500, 2, { format: ',.0f', formatter: ({ value, index }) => `${String(value)}@${index}` })).toBe('1500@2');
  });

  it('measure with the font they are drawn in', () => {
    expect(axisFont(resolveLabelStyle({ fontSize: 14, fontWeight: 'bold' }, theme, 11))).toBe('bold 14px sans-serif');
  });
});

describe('titles', () => {
  it('are invisible without text to print', () => {
    expect(resolveTitleStyle(undefined, theme, 11).visible).toBe(false);
    expect(resolveTitleStyle({ text: 'Sales' }, theme, 11).visible).toBe(true);
    expect(resolveTitleStyle({ text: 'Sales', enabled: false }, theme, 11).visible).toBe(false);
  });

  it('take the title style of the theme', () => {
    expect(resolveTitleStyle({ text: 'Sales' }, themed, 11)).toMatchObject({ size: 15, color: '#000', weight: 'bold' });
  });

  it('take room out of the chart only when they are there', () => {
    const shown = resolveTitleStyle({ text: 'Sales', fontSize: 12 }, theme, 11);
    const hidden = resolveTitleStyle(undefined, theme, 11);
    expect(titleInsets(shown, hidden, 6)).toEqual({ bottom: 18, left: 0 });
    expect(titleInsets(hidden, shown, 6)).toEqual({ bottom: 0, left: 18 });
    expect(titleInsets(hidden, hidden, 6)).toEqual({ bottom: 0, left: 0 });
  });
});
