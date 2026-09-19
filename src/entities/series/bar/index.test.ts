import { BarSeries, type BarSeriesOptions } from './index';
import type { CartesianRenderContext, LabelOverflowContext, LayoutRect, SeriesEnv } from '@/shared/kernel';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';
import { contrastTextColor, LabelPlacements } from '@/shared/util';
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
    fontSize: 11,
    strokeWidth: 2,
    positiveColor: '#21a06c',
    negativeColor: '#e5484d',
    palette: { fills: ['#436ff4'], strokes: ['#2f56cc'], sequential: ['#dbe6ff', '#1d4fd7'] },
    axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
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

/** Canvas calls a group makes when it renders — the drawing methods by name. */
function drawCalls(group: Group): string[] {
  const recorded: string[] = [];
  const state: Record<string | symbol, unknown> = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 0 });
      return (..._args: unknown[]) => recorded.push(String(prop));
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  group.render(ctx);
  return recorded;
}

describe('layer of the value labels', () => {
  const bands = new BandScale(
    data.map((datum) => datum.channel),
    [plot.x, plot.x + plot.width],
  );

  function render(): { marks: Group; labels: Group } {
    const marks = new Group();
    const labels = new Group();
    const vertical = new BarSeries({ type: 'bar', xField: 'channel', yField: 'share', label: { enabled: true } }, env);
    vertical.update({
      data,
      xScale: bands,
      yScale: new LinearScale([0, 0.6], [plot.y + plot.height, plot.y]),
      swapped: false,
      plot,
      layer: marks,
      measureText,
      labelLayer: labels,
    });
    return { marks, labels };
  }

  it('is the one above the bars, so a neighbour cannot cover the text', () => {
    const { marks, labels } = render();
    expect(drawCalls(marks)).not.toContain('fillText');
    expect(drawCalls(labels).filter((call) => call === 'fillText')).toHaveLength(data.length);
  });

  // bars of nearly equal height put their labels in one row, where wide text collides
  const level = [
    { channel: 'Direct', share: 0.6 },
    { channel: 'Organic', share: 0.59 },
  ];

  function renderCrowded(avoidOverlap: boolean): Group {
    const labels = new Group();
    const crowded = new BarSeries(
      {
        type: 'bar',
        xField: 'channel',
        yField: 'share',
        label: { enabled: true, avoidOverlap, formatter: () => 'a very long label indeed' },
      },
      env,
    );
    crowded.update({
      measureText,
      data: level,
      xScale: bands,
      yScale: new LinearScale([0, 0.6], [plot.y + plot.height, plot.y]),
      swapped: false,
      plot,
      layer: new Group(),
      labelLayer: labels,
      labelGuard: new LabelPlacements(measureText),
    });
    return labels;
  }

  it('drops a label that runs into one already placed when asked to', () => {
    // both labels are 240px wide over bars 200px apart: only the first fits
    expect(drawCalls(renderCrowded(true)).filter((call) => call === 'fillText')).toHaveLength(1);
  });

  it('keeps both labels while avoidOverlap is off', () => {
    expect(drawCalls(renderCrowded(false)).filter((call) => call === 'fillText')).toHaveLength(level.length);
  });

  it('falls back to the series layer when the chart offers none', () => {
    const marks = new Group();
    const vertical = new BarSeries({ type: 'bar', xField: 'channel', yField: 'share', label: { enabled: true } }, env);
    vertical.update({
      data,
      xScale: bands,
      yScale: new LinearScale([0, 0.6], [plot.y + plot.height, plot.y]),
      swapped: false,
      plot,
      layer: marks,
      measureText,
    });
    expect(drawCalls(marks).filter((call) => call === 'fillText')).toHaveLength(data.length);
  });
});

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

describe('item styler', () => {
  const signed = [
    { channel: 'Direct', share: -0.2 },
    { channel: 'Organic', share: 0.6 },
  ];
  const redWhenNegative: BarSeriesOptions['itemStyler'] = ({ datum }) => (Number(datum.share) < 0 ? { fill: '#d64545' } : undefined);

  function render(
    options: Partial<BarSeriesOptions>,
    extra: Partial<CartesianRenderContext> = {},
  ): { bar: BarSeries; rects: Rect[]; texts: Text[] } {
    const layer = new Group();
    const bar = new BarSeries({ type: 'bar', xField: 'channel', yField: 'share', ...options }, env);
    bar.update({
      data: signed,
      xScale: new BandScale(
        signed.map((datum) => datum.channel),
        [plot.x, plot.x + plot.width],
      ),
      yScale: new LinearScale([-0.2, 0.6], [plot.y + plot.height, plot.y]),
      swapped: false,
      plot,
      layer,
      measureText,
      ...extra,
    });
    return { bar, rects: nodesOf(layer, Rect), texts: nodesOf(layer, Text) };
  }

  it('paints the bars it answers for and leaves the rest the series color', () => {
    const { rects } = render({ itemStyler: redWhenNegative });
    expect(rects.map((rect) => rect.fill)).toEqual(['#d64545', '#436ff4']);
  });

  it('hands the styler the fill the bar would have without it', () => {
    const seen: unknown[] = [];
    render({ fill: '#123456', itemStyler: ({ fill, index }) => void seen.push([index, fill]) });
    expect(seen).toEqual([
      [0, '#123456'],
      [1, '#123456'],
    ]);
  });

  it('keeps the styled color under the pointer', () => {
    const { rects } = render({ itemStyler: redWhenNegative }, { highlight: { seriesId: 'bar-0', datumIndex: 0 } });
    expect(rects[0]?.fill).toBe('#d64545');
  });

  it('picks the contrast of an inside label from the styled fill', () => {
    const { texts } = render({ itemStyler: () => ({ fill: '#ffffff' }), label: { enabled: true, placement: 'center' } });
    // white bars ask for dark text, where the blue of the series asks for light
    expect(contrastTextColor('#ffffff')).not.toBe(contrastTextColor('#436ff4'));
    expect(texts.map((text) => text.fill)).toEqual([contrastTextColor('#ffffff'), contrastTextColor('#ffffff')]);
    expect(texts[0]?.outline).toBe('#ffffff');
  });

  it('colours the label of an item, over the label color of the series', () => {
    const { texts } = render({
      label: { enabled: true, color: '#111' },
      itemStyler: ({ datum }) => (Number(datum.share) < 0 ? { label: { color: '#d64545' } } : undefined),
    });
    expect(texts.map((text) => text.fill)).toEqual(['#d64545', '#111']);
  });

  it('dims an unselected bar over its styled color, and outlines a selected one', () => {
    const { rects } = render(
      { itemStyler: () => ({ fill: '#d64545', stroke: '#00ff00' }) },
      { selected: new Set([1]), selectionActive: true, selectionStyle: { stroke: '#000', inactiveOpacity: 0.5 } },
    );
    expect(rects[0]?.fill).toBe('#d64545');
    expect(rects[0]?.opacity).toBeCloseTo(0.5, 6);
    expect(rects[0]?.stroke).toBe('#00ff00');
    expect(rects[1]?.stroke).toBe('#000');
  });

  it('gives the tooltip the color of the bar and the legend the color of the series', () => {
    const { bar } = render({ itemStyler: redWhenNegative });
    expect(bar.tooltipFor(0).rows[0]?.color).toBe('#d64545');
    expect(bar.tooltipFor(1).rows[0]?.color).toBe('#436ff4');
    expect(bar.legendItems()[0]?.color).toBe('#436ff4');
  });
});
