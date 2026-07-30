import { BarSeries, type BarSeriesOptions } from './index';
import type { LabelOverflowContext, LayoutRect, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'bar-0',
  colors: { fill: '#436ff4', stroke: '#2f56cc' },
  theme: {
    backgroundColor: '#fff',
    foregroundColor: '#111',
    mutedColor: '#888',
    axisColor: '#ddd',
    fontFamily: 'sans-serif',
    palette: { fills: ['#436ff4'], strokes: ['#2f56cc'] },
  },
};

const plot: LayoutRect = { x: 0, y: 0, width: 400, height: 300 };
const data = [
  { channel: 'Direct', share: 0.2 },
  { channel: 'Organic', share: 0.6 },
];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

/** Horizontal bars: the category runs down the left, the value across. */
function horizontalContext(): LabelOverflowContext {
  const bands = new BandScale(
    data.map((datum) => datum.channel),
    [plot.y, plot.y + plot.height],
  );
  return {
    data,
    xScale: new LinearScale([0, 0.6], [plot.x, plot.x + plot.width]),
    yScale: bands,
    swapped: true,
    plot,
    measureText,
  };
}

function series(options: Partial<BarSeriesOptions>): BarSeries {
  return new BarSeries({ type: 'bar', xField: 'channel', yField: 'share', direction: 'horizontal', ...options }, env);
}

describe('room the value labels ask for', () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };

  it('is nothing while the labels are off', () => {
    expect(series({}).labelOverflow(horizontalContext())).toEqual(none);
  });

  it('covers the label of the longest bar, gap included', () => {
    // the widest bar ends on the plot edge, so its label lies wholly outside
    const bar = series({
      label: { enabled: true, placement: 'right', formatter: ({ value }) => `${Math.round(value * 100)}%` },
    });
    const overflow = bar.labelOverflow(horizontalContext());
    // placeRectLabel keeps a 6px inset between the bar and the text
    expect(overflow.right).toBeCloseTo(6 + measureText('60%'), 6);
    expect(overflow.left).toBe(0);
  });

  it('is nothing for labels drawn inside the bar', () => {
    const inner = series({ label: { enabled: true, placement: 'inner-right' } });
    expect(inner.labelOverflow(horizontalContext())).toEqual(none);
  });

  it('reaches upwards for labels above vertical bars', () => {
    const bands = new BandScale(
      data.map((datum) => datum.channel),
      [plot.x, plot.x + plot.width],
    );
    const vertical = new BarSeries({ type: 'bar', xField: 'channel', yField: 'share', label: { enabled: true } }, env);
    const overflow = vertical.labelOverflow({
      data,
      xScale: bands,
      yScale: new LinearScale([0, 0.6], [plot.y + plot.height, plot.y]),
      swapped: false,
      plot,
      measureText,
    });
    // the tallest bar tops out on the plot edge: the label sits above it, 4px clear
    expect(overflow.top).toBeCloseTo(4 + 11, 6);
    expect(overflow.bottom).toBe(0);
  });

  it('ignores a hidden series', () => {
    const hidden = series({ label: { enabled: true, placement: 'right' } });
    hidden.visible = false;
    expect(hidden.labelOverflow(horizontalContext())).toEqual(none);
  });
});
