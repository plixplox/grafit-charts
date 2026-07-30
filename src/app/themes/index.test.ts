import { applyThemeOverrides, resolveTheme, THEME_NAMES, type ThemeName } from './index';
import { BUILT_IN } from './presets';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import { describe, expect, it } from 'vitest';

describe('built-in themes', () => {
  it('lists every preset exactly once', () => {
    expect([...THEME_NAMES].sort()).toEqual(Object.keys(BUILT_IN).sort());
  });

  it('keeps the light and dark themes on their published tokens', () => {
    // the guard rail for the screenshot baselines: these two must not drift
    expect(resolveTheme('default')).toEqual({
      backgroundColor: '#ffffff',
      foregroundColor: '#1f2733',
      mutedColor: '#7a8190',
      axisColor: '#d9dde3',
      fontFamily: 'system-ui, sans-serif',
      fontSize: 11,
      strokeWidth: 2,
      positiveColor: '#21a06c',
      negativeColor: '#e5484d',
      palette: {
        fills: ['#3d72e8', '#8f6fe8', '#f4a236', '#1ac0c6', '#f45d8a', '#7bc043'],
        strokes: ['#3d72e8', '#8f6fe8', '#f4a236', '#1ac0c6', '#f45d8a', '#7bc043'],
        sequential: ['#dbe6ff', '#1d4fd7'],
      },
      axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
    });
    expect(resolveTheme('dark').backgroundColor).toBe('#15181c');
    expect(resolveTheme('dark').palette.fills).toEqual(resolveTheme('default').palette.fills);
  });

  it('gives every preset a full palette and readable chrome', () => {
    for (const name of THEME_NAMES) {
      const theme = resolveTheme(name);
      expect(theme.palette.fills.length).toBeGreaterThanOrEqual(5);
      expect(theme.palette.sequential.length).toBeGreaterThanOrEqual(2);
      expect(theme.foregroundColor).not.toBe(theme.backgroundColor);
    }
  });

  it('turns the axis chrome up in the contrast theme', () => {
    const theme = resolveTheme('contrast');
    expect(theme.axis.tick).toBe(true);
    expect(theme.axis.gridDash).toEqual([]);
    expect(theme.strokeWidth).toBe(3);
  });
});

describe('resolveTheme', () => {
  it('returns the default theme for an unknown name', () => {
    // an unknown baseTheme can arrive from imported JSON — falling back beats throwing
    expect(resolveTheme({ baseTheme: 'nope' as ThemeName })).toEqual(resolveTheme('default'));
  });

  it('lets params override the base theme', () => {
    const theme = resolveTheme({ baseTheme: 'dark', params: { mutedColor: '#abcdef', fontSize: 14 } });
    expect(theme.mutedColor).toBe('#abcdef');
    expect(theme.fontSize).toBe(14);
    // untouched tokens keep coming from the base
    expect(theme.backgroundColor).toBe('#15181c');
  });

  it('merges the axis block field by field', () => {
    const theme = resolveTheme({ params: { axisColor: '#111' }, axis: { tick: true } });
    expect(theme.axis.tick).toBe(true);
    expect(theme.axis.gridDash).toEqual([4, 4]);
    expect(theme.axis.gridLine).toBe(true);
  });

  it('leaves the per-element axis colours unset so they follow axisColor', () => {
    const theme = resolveTheme({ params: { axisColor: '#111' } });
    expect(theme.axis.color).toBeUndefined();
    expect(theme.axis.gridColor).toBeUndefined();
    expect(theme.axis.labelColor).toBeUndefined();
    // splitting one out leaves the rest following the shared token
    const split = resolveTheme({ params: { axisColor: '#111' }, axis: { gridColor: '#eee' } });
    expect(split.axis.gridColor).toBe('#eee');
    expect(split.axis.color).toBeUndefined();
  });

  it('replaces the palette wholesale instead of merging it index by index', () => {
    const theme = resolveTheme({ palette: { fills: ['#111', '#222'] } });
    expect(theme.palette.fills).toEqual(['#111', '#222']);
  });

  it('falls back to the fills when no strokes are given', () => {
    expect(resolveTheme({ palette: { fills: ['#111', '#222'] } }).palette.strokes).toEqual(['#111', '#222']);
    expect(resolveTheme({ palette: { fills: ['#111'], strokes: ['#333'] } }).palette.strokes).toEqual(['#333']);
  });

  it('ignores an empty or malformed palette', () => {
    expect(resolveTheme({ palette: { fills: [] } }).palette.fills).toEqual(resolveTheme('default').palette.fills);
    expect(resolveTheme({ palette: { sequential: [] } }).palette.sequential).toEqual(['#dbe6ff', '#1d4fd7']);
  });

  it('leaves the nudge tokens unset so each mark keeps its own default', () => {
    const theme = resolveTheme('default');
    expect(theme.cornerRadius).toBeUndefined();
    expect(theme.fillOpacity).toBeUndefined();
  });
});

describe('themeFont', () => {
  it('reproduces the built-in sizes from the base', () => {
    const theme = resolveTheme('default');
    expect(themeFont(theme, FONT_STEP.small)).toBe(10);
    expect(themeFont(theme, FONT_STEP.label)).toBe(11);
    expect(themeFont(theme, FONT_STEP.heading)).toBe(12);
    expect(themeFont(theme, FONT_STEP.subtitle)).toBe(13);
    expect(themeFont(theme, FONT_STEP.emphasis)).toBe(14);
    expect(themeFont(theme, FONT_STEP.title)).toBe(17);
  });

  it('moves every role together and never reaches zero', () => {
    const bigger = resolveTheme({ params: { fontSize: 14 } });
    expect(themeFont(bigger, FONT_STEP.title)).toBe(20);
    const tiny = resolveTheme({ params: { fontSize: 1 } });
    expect(themeFont(tiny, FONT_STEP.small)).toBe(1);
  });
});

describe('applyThemeOverrides', () => {
  it('layers common blocks under the user options', () => {
    const result = applyThemeOverrides({
      legend: { position: 'top' as const },
      theme: { overrides: { common: { legend: { position: 'right', enabled: false } } } },
    });
    expect(result.legend).toEqual({ position: 'top', enabled: false });
  });

  it('applies per-type defaults to matching series only', () => {
    const result = applyThemeOverrides({
      series: [{ type: 'bar' }, { type: 'line' }],
      theme: { overrides: { bar: { series: { cornerRadius: 6 } } } },
    });
    expect(result.series?.[0]).toEqual({ type: 'bar', cornerRadius: 6 });
    expect(result.series?.[1]).toEqual({ type: 'line' });
  });

  it('leaves options untouched for a named theme', () => {
    const options = { series: [{ type: 'bar' }], theme: 'dark' };
    expect(applyThemeOverrides(options)).toBe(options);
  });
});
