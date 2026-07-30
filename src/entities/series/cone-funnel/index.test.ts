import { ConeFunnelSeries, type ConeFunnelSeriesOptions } from './index';
import type { LabelOverflowContext, LayoutRect, SeriesEnv } from '@/shared/kernel';
import { LinearScale } from '@/shared/scale';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'cone-funnel-0',
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
  { stage: 'Leads', count: 100 },
  { stage: 'Won', count: 50 },
];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function context(): LabelOverflowContext {
  return {
    data,
    xScale: new LinearScale([0, 1], [plot.x, plot.x + plot.width]),
    yScale: new LinearScale([0, 1], [plot.y + plot.height, plot.y]),
    swapped: false,
    plot,
    measureText,
  };
}

function series(options: Partial<ConeFunnelSeriesOptions>): ConeFunnelSeries {
  return new ConeFunnelSeries(
    { type: 'cone-funnel', stageField: 'stage', valueField: 'count', xField: 'stage', yField: 'count', ...options },
    env,
  );
}

describe('room the stage labels ask for', () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };

  it('is nothing for labels inside the shape', () => {
    expect(series({}).labelOverflow(context())).toEqual(none);
    expect(series({ label: { placement: 'inside' } }).labelOverflow(context())).toEqual(none);
  });

  it('covers the widest outside label past the shape edge', () => {
    const funnel = series({ label: { placement: 'outside' } });
    const overflow = funnel.labelOverflow(context());
    // top stage: full width 0.62 · 400, the slanted edge met at (100% + 50%) / 4
    const edgeX = plot.width / 2 + (0.62 * 400 + 0.62 * 200) / 4;
    // 3px to the callout, 14px of line, 5px to the text
    const expected = edgeX + 3 + 14 + 5 + measureText('Leads · 100') - plot.width;
    expect(overflow.right).toBeCloseTo(expected, 6);
    expect(overflow.left).toBe(0);
  });

  it('counts the formatted text', () => {
    const funnel = series({
      label: { placement: 'outside', formatter: ({ stage }) => `${stage} — a much longer caption` },
    });
    const short = series({ label: { placement: 'outside', formatter: ({ stage }) => stage } });
    expect(funnel.labelOverflow(context()).right).toBeGreaterThan(short.labelOverflow(context()).right);
  });
});
