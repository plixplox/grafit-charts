import { BoxPlotSeries, type BoxPlotSeriesOptions } from './index';
import type { LayoutRect, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Line, Rect } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'series-0',
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
    palette: { fills: ['#436ff4'], strokes: ['#2f56cc'], sequential: ['#dbe6ff', '#1d4fd7'] },
    axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
  },
};

const plot: LayoutRect = { x: 0, y: 0, width: 400, height: 300 };

/** Nodes of one kind a layer holds, in drawing order. */
function nodesOf<T>(layer: Group, kind: abstract new (...args: never[]) => T): T[] {
  const found: T[] = [];
  const walk = (node: { children?: unknown[] }) => {
    for (const child of node.children ?? []) {
      if (child instanceof kind) found.push(child);
      else walk(child as { children?: unknown[] });
    }
  };
  walk(layer as unknown as { children?: unknown[] });
  return found;
}

const data = [
  { group: 'A', min: 1, q1: 3, median: 5, q3: 7, max: 9 },
  { group: 'B', min: 2, q1: 4, median: 8, q3: 9, max: 10 },
];

function render(options: Partial<BoxPlotSeriesOptions>) {
  const layer = new Group();
  const series = new BoxPlotSeries(
    {
      type: 'box-plot',
      xField: 'group',
      minField: 'min',
      q1Field: 'q1',
      medianField: 'median',
      q3Field: 'q3',
      maxField: 'max',
      yField: '',
      ...options,
    },
    env,
  );
  series.update({
    data,
    xScale: new BandScale(
      data.map((datum) => datum.group),
      [plot.x, plot.x + plot.width],
    ),
    yScale: new LinearScale([0, 10], [plot.y + plot.height, plot.y]),
    swapped: false,
    plot,
    layer,
    measureText: (text: string) => text.length * 10,
  });
  return { series, boxes: nodesOf(layer, Rect), lines: nodesOf(layer, Line) };
}

describe('item styler', () => {
  it('is told the five numbers of the box', () => {
    const seen: unknown[] = [];
    render({ itemStyler: ({ min, q1, median, q3, max }) => void seen.push([min, q1, median, q3, max]) });
    expect(seen).toEqual([
      [1, 3, 5, 7, 9],
      [2, 4, 8, 9, 10],
    ]);
  });

  it('fills the box and strokes the whole glyph', () => {
    const { boxes, lines, series } = render({
      itemStyler: ({ median }) => (median > 6 ? { fill: '#d64545', stroke: '#8a1f1f' } : undefined),
    });
    expect(boxes.map((box) => box.fill)).toEqual(['#436ff4', '#d64545']);
    expect(boxes[1]?.stroke).toBe('#8a1f1f');
    // whisker, two caps and the median of the second box
    expect(lines.slice(4).map((line) => line.stroke)).toEqual(['#8a1f1f', '#8a1f1f', '#8a1f1f', '#8a1f1f']);
    expect(series.tooltipFor(1).rows[0]?.color).toBe('#d64545');
  });
});
