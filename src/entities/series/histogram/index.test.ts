import { HistogramSeries, type HistogramSeriesOptions } from './index';
import type { LayoutRect, SeriesEnv } from '@/shared/kernel';
import type { Datum } from '@/shared/options';
import { LinearScale } from '@/shared/scale';
import { Group } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'histogram-0',
  colors: { fill: '#436ff4', stroke: '#2f56cc' },
  theme: {
    backgroundColor: '#fff',
    foregroundColor: '#111',
    mutedColor: '#888',
    axisColor: '#ddd',
    fontFamily: 'sans-serif',
    fontSize: 11,
    strokeWidth: 2,
    positiveColor: '#21a06c',
    negativeColor: '#e5484d',
    palette: { fills: ['#436ff4', '#21a06c', '#e5484d'], strokes: ['#2f56cc'], sequential: ['#dbe6ff', '#1d4fd7'] },
    axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
  },
};

function series(options: Partial<HistogramSeriesOptions>): HistogramSeries {
  return new HistogramSeries({ type: 'histogram', xField: 'value', ...options } as HistogramSeriesOptions & { yField: string }, env);
}

/** The bin edges the series hands the x axis, deduplicated in order. */
function edges(histogram: HistogramSeries, data: Datum[]): number[] {
  return [...new Set(histogram.xValues(data) as number[])];
}

const plot: LayoutRect = { x: 0, y: 0, width: 400, height: 300 };

/** Draws the series, the way a chart would, so the bins become readable. */
function render(histogram: HistogramSeries, data: Datum[]): void {
  const domain = histogram.yDomain(data) ?? [0, 1];
  histogram.update({
    data,
    xScale: new LinearScale(edgeExtent(histogram, data), [plot.x, plot.x + plot.width]),
    yScale: new LinearScale(domain, [plot.y + plot.height, plot.y]),
    swapped: false,
    plot,
    layer: new Group(),
  });
}

/** What the tooltip of each bin reads out, in order. */
function binTexts(histogram: HistogramSeries, data: Datum[]): string[] {
  render(histogram, data);
  const texts: string[] = [];
  for (let bin = 0; histogram.nodeAt(bin); bin++) texts.push(histogram.tooltipFor(bin).rows[0]!.value);
  return texts;
}

/** The same, as numbers: a normalized tooltip leads with its value. */
function binValues(histogram: HistogramSeries, data: Datum[]): number[] {
  return binTexts(histogram, data).map((text) => Number.parseFloat(text));
}

function edgeExtent(histogram: HistogramSeries, data: Datum[]): [number, number] {
  const all = edges(histogram, data);
  return [all[0] ?? 0, all.at(-1) ?? 1];
}

const data = [3, 7, 12, 14, 19, 22].map((value) => ({ value }));

describe('binning options reach the bins', () => {
  it('lays the grid out by binWidth', () => {
    expect(edges(series({ binWidth: 10 }), data)).toEqual([0, 10, 20, 30]);
  });

  it('shifts the whole grid by binOrigin', () => {
    expect(edges(series({ binWidth: 10, binOrigin: 5 }), data)).toEqual([-5, 5, 15, 25]);
  });

  it('counts every value exactly once across the bins', () => {
    const counts = binValues(series({ binWidth: 10 }), data);
    expect(counts).toEqual([2, 3, 1]);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(data.length);
  });

  it('drops what falls outside the domain', () => {
    expect(binValues(series({ domain: [0, 20], binWidth: 10 }), data)).toEqual([2, 3]);
  });

  it('piles it into the edge bin instead when outliers are clamped', () => {
    expect(binValues(series({ domain: [0, 20], binWidth: 10, outliers: 'clamp' }), data)).toEqual([2, 4]);
  });

  it('hands an edge value to the right-hand bin, or the left one on request', () => {
    const onEdge = [10, 20].map((value) => ({ value }));
    expect(binValues(series({ binWidth: 10, domain: [0, 30] }), onEdge)).toEqual([0, 1, 1]);
    expect(binValues(series({ binWidth: 10, domain: [0, 30], binInclusive: 'right' }), onEdge)).toEqual([1, 1, 0]);
  });
});

describe('aggregation over a bin', () => {
  const weighted = [
    { value: 1, amount: 10 },
    { value: 4, amount: 20 },
    { value: 11, amount: 5 },
  ];

  it('sums the value field by default', () => {
    expect(binValues(series({ yField: 'amount', binWidth: 10 }), weighted)).toEqual([30, 5]);
  });

  it('averages it on request', () => {
    expect(binValues(series({ yField: 'amount', aggregation: 'mean', binWidth: 10 }), weighted)).toEqual([15, 5]);
  });

  it('leaves an empty bin at zero rather than NaN', () => {
    // 5..10 holds nothing: a mean over no rows is 0, not NaN
    expect(binValues(series({ yField: 'amount', aggregation: 'mean', binWidth: 5 }), weighted)).toEqual([15, 0, 5]);
  });

  it('ignores rows whose value field is not a number', () => {
    const rows = [...weighted, { value: 2, amount: 'n/a' }];
    expect(binValues(series({ yField: 'amount', binWidth: 10 }), rows)).toEqual([30, 5]);
  });
});

describe('normalize', () => {
  it('restates the counts as percentages of the whole', () => {
    const percent = binValues(series({ binWidth: 10, normalize: 'percent' }), data);
    expect(percent).toEqual([33.3, 50, 16.7]); // one decimal: what the tooltip prints
    expect(percent.reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 0);
  });

  it('runs the percentages up to a hundred when cumulative', () => {
    expect(binValues(series({ binWidth: 10, normalize: 'cumulative-percent' }), data)).toEqual([33.3, 83.3, 100]);
  });

  it('keeps the count beside the share, so the tooltip stays honest', () => {
    expect(binTexts(series({ binWidth: 10, normalize: 'percent' }), data)).toEqual(['33.3% (2)', '50% (3)', '16.7% (1)']);
  });

  it('says nothing extra when the bars are counts', () => {
    expect(binTexts(series({ binWidth: 10 }), data)).toEqual(['2', '3', '1']);
  });

  it('scales the y domain with the values', () => {
    expect(series({ binWidth: 10, normalize: 'frequency' }).yDomain(data)).toEqual([0, 0.5]);
  });

  it('hands the label formatter both the share and what it came from', () => {
    const seen: Array<{ value: number; raw: number; count: number }> = [];
    const histogram = series({
      binWidth: 10,
      normalize: 'percent',
      label: {
        enabled: true,
        formatter: ({ value, raw, count }) => {
          seen.push({ value, raw, count });
          return `${Math.round(value)}%`;
        },
      },
    });
    render(histogram, data);
    expect(seen.map(({ raw, count }) => ({ raw, count }))).toEqual([
      { raw: 2, count: 2 },
      { raw: 3, count: 3 },
      { raw: 1, count: 1 },
    ]);
    expect(seen.map(({ value }) => value)).toEqual([expect.closeTo(100 / 3, 10), 50, expect.closeTo(100 / 6, 10)]);
  });
});

describe('the y domain', () => {
  it('always reaches zero, so the bars stand on the axis', () => {
    expect(series({ binWidth: 10 }).yDomain(data)).toEqual([0, 3]);
  });

  it('is undefined when there is nothing to bin', () => {
    expect(series({}).yDomain([])).toBeUndefined();
  });
});

/** Two channels over two bins: web 2/1, app 1/1. */
const split = [
  { value: 1, channel: 'web' },
  { value: 2, channel: 'web' },
  { value: 12, channel: 'web' },
  { value: 3, channel: 'app' },
  { value: 15, channel: 'app' },
];
const grouped = { xField: 'value', groupField: 'channel', binWidth: 10, domain: [0, 20] as [number, number] };

describe('a histogram split by a field', () => {
  it('puts a legend item per group, coloured off the palette', () => {
    const histogram = series(grouped);
    histogram.setData(split);
    expect(histogram.legendItems()).toEqual([
      { seriesId: 'histogram-0#0', label: 'web', color: '#436ff4', visible: true },
      { seriesId: 'histogram-0#1', label: 'app', color: '#21a06c', visible: true },
    ]);
  });

  it('keeps a single legend item while nothing splits it', () => {
    const histogram = series({ binWidth: 10, name: 'Sessions' });
    histogram.setData(data);
    expect(histogram.legendItems()).toEqual([{ seriesId: 'histogram-0', label: 'Sessions', color: '#436ff4', visible: true }]);
  });

  it('names the group in the tooltip of a bar', () => {
    const histogram = series(grouped);
    render(histogram, split);
    // bars are counted bin by bin, group within bin: #1 is 'app' in the first bin
    expect(histogram.tooltipFor(1)).toEqual({
      heading: '0 – 10',
      rows: [{ label: 'app', value: '1', color: '#21a06c' }],
    });
  });

  it('stacks the groups by default: the domain covers the bin total', () => {
    expect(series(grouped).yDomain(split)).toEqual([0, 3]);
  });

  it('lets a bar stand on its own under grouped and overlay', () => {
    expect(series({ ...grouped, groupMode: 'grouped' }).yDomain(split)).toEqual([0, 2]);
    expect(series({ ...grouped, groupMode: 'overlay' }).yDomain(split)).toEqual([0, 2]);
  });

  it('runs every bin up to a hundred under normalized', () => {
    expect(series({ ...grouped, groupMode: 'normalized' }).yDomain(split)).toEqual([0, 100]);
  });
});

describe('where a grouped bar ends up', () => {
  /** The bar under a point, as "<group label> in bin <index>". */
  function barAt(histogram: HistogramSeries, x: number, y: number): string | undefined {
    const pick = histogram.pick(x, y);
    if (!pick) return undefined;
    const { heading, rows } = histogram.tooltipFor(pick.datumIndex);
    return `${rows[0]!.label} in ${String(heading)}`;
  }

  it('splits the bin between the groups when they stand side by side', () => {
    // the first bin spans x 0..200; two groups halve it
    const histogram = series({ ...grouped, groupMode: 'grouped' });
    render(histogram, split);
    expect(barAt(histogram, 50, 290)).toBe('web in 0 – 10');
    expect(barAt(histogram, 150, 290)).toBe('app in 0 – 10');
  });

  it('piles them along the same x when they are stacked', () => {
    // domain 0..3 over 300px: 'web' holds the bottom two thirds, 'app' the top
    const histogram = series(grouped);
    render(histogram, split);
    expect(barAt(histogram, 50, 290)).toBe('web in 0 – 10');
    expect(barAt(histogram, 50, 50)).toBe('app in 0 – 10');
  });

  it('hands the top bar to the cursor where the groups overlap', () => {
    const histogram = series({ ...grouped, groupMode: 'overlay' });
    render(histogram, split);
    // both bars start at zero and cover this point; the last drawn is on top
    expect(barAt(histogram, 50, 290)).toBe('app in 0 – 10');
  });
});

describe('switching a group off in the legend', () => {
  it('leaves its bars undrawn and its rows out of the totals', () => {
    const histogram = series({ ...grouped, normalize: 'percent' });
    histogram.setData(split);
    histogram.toggleItem(1);
    expect(histogram.legendItems()[1]!.visible).toBe(false);
    render(histogram, split);
    // the three 'web' rows now carry the whole hundred
    expect(histogram.tooltipFor(0).rows[0]!.value).toBe('66.7% (2)');
    expect(histogram.nodeAt(1)).toBeUndefined();
  });

  it('gives the bin back to the group left standing under grouped', () => {
    const histogram = series({ ...grouped, groupMode: 'grouped' });
    histogram.setData(split);
    histogram.toggleItem(1);
    render(histogram, split);
    // 'web' alone now spans the whole bin, x 0..200
    expect(histogram.pick(150, 290)?.datumIndex).toBe(0);
  });

  it('turns back on when clicked again', () => {
    const histogram = series(grouped);
    histogram.setData(split);
    histogram.toggleItem(1);
    histogram.toggleItem(1);
    expect(histogram.legendItems().map((item) => item.visible)).toEqual([true, true]);
  });
});
