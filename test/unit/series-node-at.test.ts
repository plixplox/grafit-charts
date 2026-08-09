/**
 * nodeAt is pick() run backwards, and the pair has to agree: whatever the
 * cursor finds at a point, addressing the same datum must land on that point.
 */
import { BarSeries } from '@/entities/series/bar';
import { CandlestickSeries } from '@/entities/series/candlestick';
import { HeatmapSeries } from '@/entities/series/heatmap';
import { ScatterSeries } from '@/entities/series/scatter';
import type { CartesianRenderContext, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'series-0',
  colors: { fill: '#3b82f6', stroke: '#1d4ed8' },
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
    palette: { fills: ['#3b82f6'], strokes: ['#1d4ed8'], sequential: ['#dbe6ff', '#1d4fd7'] },
    axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
  },
};

const plot = { x: 0, y: 0, width: 400, height: 300 };

function context(data: Record<string, unknown>[], xScale: BandScale | LinearScale, yScale: LinearScale): CartesianRenderContext {
  return { data, xScale, yScale, swapped: false, plot, layer: new Group() };
}

describe('nodeAt', () => {
  it('lands on the point the cursor would pick (scatter)', () => {
    const data = [
      { x: 10, y: 2 },
      { x: 40, y: 6 },
    ];
    const series = new ScatterSeries({ type: 'scatter', xField: 'x', yField: 'y' }, env);
    series.update(context(data, new LinearScale([0, 50], [0, 400]), new LinearScale([0, 8], [300, 0])));

    const node = series.nodeAt(1);
    expect(node).toBeDefined();
    expect(series.pick(node!.x, node!.y)?.datumIndex).toBe(1);
  });

  it('anchors a bar at the top of its rect, where the tooltip hangs (bar)', () => {
    const data = [
      { month: 'Jan', value: 4 },
      { month: 'Feb', value: 9 },
    ];
    const series = new BarSeries({ type: 'bar', xField: 'month', yField: 'value' }, env);
    series.update(context(data, new BandScale(['Jan', 'Feb'], [0, 400]), new LinearScale([0, 10], [300, 0])));

    const node = series.nodeAt(1);
    expect(node).toBeDefined();
    // the anchor sits on the edge, so probe just inside the bar
    expect(series.pick(node!.x, node!.y + 1)?.datumIndex).toBe(1);
    expect(node!.centerY).toBeGreaterThan(node!.y);
  });

  it('carries the cell center for heatmap tooltips', () => {
    const data = [
      { day: 'Mon', hour: 'A', value: 1 },
      { day: 'Mon', hour: 'B', value: 5 },
    ];
    const series = new HeatmapSeries({ type: 'heatmap', xField: 'day', yField: 'hour', colorField: 'value' }, env);
    series.update({
      ...context(data, new BandScale(['Mon'], [0, 400]), new LinearScale([0, 1], [300, 0])),
      yScale: new BandScale(['A', 'B'], [0, 300]),
    });

    const node = series.nodeAt(1);
    expect(node).toBeDefined();
    expect(series.pick(node!.centerX!, node!.centerY!)?.datumIndex).toBe(1);
  });

  it('anchors a candle at the top of its body (candlestick)', () => {
    const data = [
      { date: 'd1', open: 5, high: 8, low: 4, close: 7 },
      { date: 'd2', open: 7, high: 9, low: 6, close: 6 },
    ];
    const series = new CandlestickSeries(
      { type: 'candlestick', xField: 'date', yField: 'close', openField: 'open', highField: 'high', lowField: 'low', closeField: 'close' },
      env,
    );
    series.update(context(data, new BandScale(['d1', 'd2'], [0, 400]), new LinearScale([0, 10], [300, 0])));

    const node = series.nodeAt(1);
    expect(node).toBeDefined();
    expect(series.pick(node!.x, node!.y + 1)?.datumIndex).toBe(1);
  });

  it('has nothing to point at for a datum that was never laid out', () => {
    const data = [{ x: 10, y: 2 }];
    const series = new ScatterSeries({ type: 'scatter', xField: 'x', yField: 'y' }, env);
    series.update(context(data, new LinearScale([0, 50], [0, 400]), new LinearScale([0, 8], [300, 0])));

    expect(series.nodeAt(7)).toBeUndefined();
  });
});
