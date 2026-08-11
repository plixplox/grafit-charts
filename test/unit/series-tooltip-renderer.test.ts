/**
 * `tooltip.renderer` is a promise the options make: whatever a series says by
 * default, the renderer speaks in its place. The series that put their tooltip
 * together themselves — a step, a range, a box, a candle, a node — have to keep
 * that promise too, and to name what they take apart in the chart's language.
 */
import { BoxPlotSeries } from '@/entities/series/box-plot';
import { CandlestickSeries } from '@/entities/series/candlestick';
import { ChordSeries } from '@/entities/series/chord';
import { NightingaleSeries } from '@/entities/series/nightingale';
import { RangeAreaSeries } from '@/entities/series/range-area';
import { RangeBarSeries } from '@/entities/series/range-bar';
import { SankeySeries } from '@/entities/series/sankey';
import { SunburstSeries } from '@/entities/series/sunburst';
import { TreemapSeries } from '@/entities/series/treemap';
import { WaterfallSeries } from '@/entities/series/waterfall';
import type { CartesianRenderContext, PolarRenderContext, SeriesEnv, StandaloneRenderContext, ThemeContext } from '@/shared/kernel';
import type { LocaleOptions } from '@/shared/locale';
import type { Datum } from '@/shared/options';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group } from '@/shared/scene';
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
  palette: { fills: ['#3b82f6', '#8b5cf6'], strokes: ['#1d4ed8'], sequential: ['#dbe6ff', '#1d4fd7'] },
  axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
};

function env(locale?: LocaleOptions): SeriesEnv {
  return { id: 'series-0', colors: { fill: '#3b82f6', stroke: '#1d4ed8' }, theme, locale };
}

const plot = { x: 0, y: 0, width: 400, height: 300 };
const measureText = (text: string) => text.length * 6;

function cartesian(data: Datum[], categories: unknown[]): CartesianRenderContext {
  return {
    data,
    measureText,
    xScale: new BandScale(categories, [0, 400]),
    yScale: new LinearScale([0, 100], [300, 0]),
    swapped: false,
    plot,
    layer: new Group(),
  };
}

function standalone(data: Datum[]): StandaloneRenderContext {
  return { data, plot, layer: new Group(), measureText };
}

describe('waterfall', () => {
  const data: Datum[] = [
    { stage: 'Start', value: 100 },
    { stage: 'Q1', value: 20 },
    { stage: 'Total', value: 0 },
  ];

  function series(locale?: LocaleOptions) {
    const instance = new WaterfallSeries({ type: 'waterfall', xField: 'stage', yField: 'value', totals: [2] }, env(locale));
    instance.update(cartesian(data, ['Start', 'Q1', 'Total']));
    return instance;
  }

  it('names the total and the running sum in the chart language', () => {
    const rows = series({ localeText: { waterfallTotal: 'Итог', waterfallCumulative: 'Накопленный итог' } }).tooltipFor(2).rows;
    expect(rows[0]?.label).toBe('Итог');
    const steps = series({ localeText: { waterfallCumulative: 'Накопленный итог' } }).tooltipFor(1).rows;
    expect(steps[1]?.label).toBe('Накопленный итог');
  });

  it('hands the renderer the step and the running total', () => {
    const instance = new WaterfallSeries(
      {
        type: 'waterfall',
        xField: 'stage',
        yField: 'value',
        totals: [2],
        tooltip: { renderer: ({ delta, total, isTotal, xValue }) => `${String(xValue)}: ${delta}/${total}/${String(isTotal)}` },
      },
      env(),
    );
    instance.update(cartesian(data, ['Start', 'Q1', 'Total']));
    expect(instance.tooltipFor(1)).toEqual({ heading: 'Q1: 20/120/false', rows: [] });
  });
});

describe('range series', () => {
  const data: Datum[] = [{ day: 'Mon', low: 4, high: 9 }];

  it('range-bar hands the renderer both ends', () => {
    const instance = new RangeBarSeries(
      {
        type: 'range-bar',
        xField: 'day',
        yField: 'high',
        yLowField: 'low',
        yHighField: 'high',
        tooltip: { renderer: ({ low, high }) => `${String(low)}..${String(high)}` },
      },
      env(),
    );
    instance.update(cartesian(data, ['Mon']));
    expect(instance.tooltipFor(0)).toEqual({ heading: '4..9', rows: [] });
  });

  it('range-area hands the renderer both ends', () => {
    const instance = new RangeAreaSeries(
      {
        type: 'range-area',
        xField: 'day',
        yField: 'high',
        yLowField: 'low',
        yHighField: 'high',
        tooltip: { renderer: ({ low, high, seriesName }) => ({ heading: seriesName, rows: [{ label: 'span', value: `${String(low)}–${String(high)}` }] }) },
      },
      env(),
    );
    instance.update(cartesian(data, ['Mon']));
    expect(instance.tooltipFor(0).rows[0]).toMatchObject({ label: 'span', value: '4–9' });
  });
});

describe('box plot', () => {
  const data: Datum[] = [{ team: 'A', min: 1, q1: 3, median: 5, q3: 7, max: 9 }];
  const options = {
    type: 'box-plot' as const,
    xField: 'team',
    yField: 'median',
    minField: 'min',
    q1Field: 'q1',
    medianField: 'median',
    q3Field: 'q3',
    maxField: 'max',
  };

  it('names the five numbers in the chart language', () => {
    const instance = new BoxPlotSeries(
      options,
      env({ localeText: { boxPlotMax: 'Максимум', boxPlotQ3: '3-й квартиль', boxPlotMedian: 'Медиана', boxPlotQ1: '1-й квартиль', boxPlotMin: 'Минимум' } }),
    );
    instance.update(cartesian(data, ['A']));
    expect(instance.tooltipFor(0).rows.map((row) => row.label)).toEqual([
      'Максимум',
      '3-й квартиль',
      'Медиана',
      '1-й квартиль',
      'Минимум',
    ]);
  });

  it('hands the renderer all five numbers', () => {
    const instance = new BoxPlotSeries(
      { ...options, tooltip: { renderer: ({ min, q1, median, q3, max }) => `${min}/${q1}/${median}/${q3}/${max}` } },
      env(),
    );
    instance.update(cartesian(data, ['A']));
    expect(instance.tooltipFor(0)).toEqual({ heading: '1/3/5/7/9', rows: [] });
  });
});

describe('candlestick', () => {
  const data: Datum[] = [{ day: 'Mon', o: 10, h: 14, l: 9, c: 12 }];
  const options = {
    type: 'candlestick' as const,
    xField: 'day',
    yField: 'c',
    openField: 'o',
    highField: 'h',
    lowField: 'l',
    closeField: 'c',
  };

  it('names the four prices in the chart language', () => {
    const instance = new CandlestickSeries(
      options,
      env({ localeText: { ohlcOpen: 'Открытие', ohlcHigh: 'Максимум', ohlcLow: 'Минимум', ohlcClose: 'Закрытие' } }),
    );
    instance.update(cartesian(data, ['Mon']));
    expect(instance.tooltipFor(0).rows.map((row) => row.label)).toEqual(['Открытие', 'Максимум', 'Минимум', 'Закрытие']);
  });

  it('hands the renderer the four prices and the direction', () => {
    const instance = new CandlestickSeries(
      { ...options, tooltip: { renderer: ({ open, close, up }) => `${String(open)}→${String(close)} ${up ? 'up' : 'down'}` } },
      env(),
    );
    instance.update(cartesian(data, ['Mon']));
    expect(instance.tooltipFor(0)).toEqual({ heading: '10→12 up', rows: [] });
  });
});

describe('radial series', () => {
  const data: Datum[] = [{ month: 'Jan', sales: 30 }];

  function polarContext(): PolarRenderContext {
    const angleScale = new BandScale(['Jan'], [0, Math.PI * 2]);
    return {
      data,
      centerX: 200,
      centerY: 150,
      radius: 120,
      area: plot,
      layer: new Group(),
      measureText,
      angleScale,
      radiusScale: new LinearScale([0, 40], [0, 120]),
    };
  }

  it('nightingale asks its renderer first', () => {
    const instance = new NightingaleSeries(
      {
        type: 'nightingale',
        angleField: 'month',
        radiusField: 'sales',
        tooltip: { renderer: ({ label, value }) => `${label}: ${String(value)} шт.` },
      },
      env(),
    );
    instance.setData(data);
    instance.update(polarContext());
    expect(instance.tooltipFor(0)).toEqual({ heading: 'Jan: 30 шт.', rows: [] });
  });
});

describe('node series', () => {
  const tree: Datum[] = [
    { label: 'App', size: 60 },
    { label: 'Docs', size: 40 },
  ];

  it('treemap asks its renderer first, with the share of the whole', () => {
    const instance = new TreemapSeries(
      {
        type: 'treemap',
        labelField: 'label',
        sizeField: 'size',
        tooltip: { renderer: ({ label, value, share }) => `${label} ${value} ${Math.round(share * 100)}%` },
      },
      env(),
    );
    instance.setData(tree);
    instance.update(standalone(tree));
    expect(instance.tooltipFor(0)).toEqual({ heading: 'App 60 60%', rows: [] });
  });

  it('sunburst asks its renderer first', () => {
    const instance = new SunburstSeries(
      { type: 'sunburst', labelField: 'label', sizeField: 'size', tooltip: { renderer: ({ label }) => `<${label}>` } },
      env(),
    );
    instance.setData(tree);
    instance.update(standalone(tree));
    expect(instance.tooltipFor(0)).toEqual({ heading: '<App>', rows: [] });
  });

  it('names the value row after the series, not after the data key', () => {
    const instance = new TreemapSeries({ type: 'treemap', labelField: 'label', sizeField: 'size', name: 'Выручка' }, env());
    instance.setData(tree);
    instance.update(standalone(tree));
    expect(instance.tooltipFor(0).rows[0]).toMatchObject({ label: 'Выручка' });
  });

  it('flow series ask their renderer too', () => {
    const flows: Datum[] = [{ from: 'A', to: 'B', value: 5 }];
    const sankey = new SankeySeries(
      { type: 'sankey', fromField: 'from', toField: 'to', sizeField: 'value', tooltip: { renderer: ({ label, value }) => `${label}=${value}` } },
      env(),
    );
    sankey.setData(flows);
    sankey.update(standalone(flows));
    expect(sankey.tooltipFor(0)).toEqual({ heading: 'A=5', rows: [] });

    const chord = new ChordSeries(
      { type: 'chord', fromField: 'from', toField: 'to', sizeField: 'value', tooltip: { renderer: ({ label }) => `chord ${label}` } },
      env(),
    );
    chord.setData(flows);
    chord.update(standalone(flows));
    expect(chord.tooltipFor(0)).toEqual({ heading: 'chord A', rows: [] });
  });
});
