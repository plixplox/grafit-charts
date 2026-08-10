/**
 * The imperative API in a real browser: the tooltip is a DOM node, the
 * selection and the zoom are chart state, and every call runs the same path
 * a pointer would. Not a screenshot test — it asserts on the DOM and the state.
 */
import type { ChartInstance, ChartOptions, SelectedNode, ZoomWindow } from 'grafit-charts';
import { Charts } from 'grafit-charts';
import { expect, test } from 'vitest';

const data = [
  { month: 'Jan', value: 10 },
  { month: 'Feb', value: 30 },
  { month: 'Mar', value: 20 },
  { month: 'Apr', value: 45 },
];

function base(extra?: Partial<ChartOptions>): ChartOptions {
  return {
    data,
    series: [{ type: 'bar', xField: 'month', yField: 'value' }],
    animation: { enabled: false },
    width: 480,
    height: 300,
    ...extra,
  };
}

async function withChart(options: ChartOptions, body: (chart: ChartInstance, container: HTMLElement) => Promise<void>): Promise<void> {
  const container = document.createElement('div');
  Object.assign(container.style, { width: '480px', height: '300px' });
  document.body.appendChild(container);
  const chart = Charts.create({ ...options, container });
  try {
    await chart.waitForUpdate();
    await body(chart, container);
  } finally {
    chart.destroy();
    container.remove();
  }
}

/** The tooltip is the container's pointer-transparent div; hidden means display:none. */
function tooltipText(container: HTMLElement): string | undefined {
  const element = [...container.querySelectorAll('div')].find((node) => node.style.pointerEvents === 'none');
  if (!element || element.style.display === 'none') return undefined;
  return element.textContent ?? '';
}

test('showTooltip puts the datum in the tooltip, hideTooltip takes it away', async () => {
  await withChart(base({ tooltip: {} }), async (chart, container) => {
    expect(tooltipText(container)).toBeUndefined();

    expect(chart.showTooltip({ datumIndex: 3 })).toBe(true);
    await chart.waitForUpdate();
    const shown = tooltipText(container);
    expect(shown).toContain('Apr');
    expect(shown).toContain('45');

    chart.hideTooltip();
    await chart.waitForUpdate();
    expect(tooltipText(container)).toBeUndefined();
  });
});

test('showTooltip answers false for a datum with no node on screen', async () => {
  await withChart(base({ tooltip: {} }), async (chart) => {
    expect(chart.showTooltip({ datumIndex: 99 })).toBe(false);
    expect(chart.showTooltip({ seriesId: 'nope-0', datumIndex: 0 })).toBe(false);
  });
});

test('clickNode fires nodeClick and selects, silent keeps the listener quiet', async () => {
  const clicks: SelectedNode[] = [];
  const selections: SelectedNode[][] = [];
  await withChart(
    base({
      selection: { enabled: true, mode: 'multiple' },
      listeners: {
        nodeClick: (event) => clicks.push(event),
        selectionChange: (event) => selections.push(event.items),
      },
    }),
    async (chart) => {
      expect(chart.clickNode({ datumIndex: 1 })).toBe(true);
      expect(clicks).toHaveLength(1);
      expect(clicks[0]?.datum).toEqual(data[1]);
      expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([1]);
      expect(selections).toHaveLength(1);

      // multiple mode: a second click adds, a repeat toggles the node off
      chart.clickNode({ datumIndex: 2 });
      expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([1, 2]);
      chart.clickNode({ datumIndex: 2 });
      expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([1]);

      const clicksBefore = clicks.length;
      const selectionsBefore = selections.length;
      chart.clickNode({ datumIndex: 3 }, { silent: true });
      expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([1, 3]);
      expect(clicks).toHaveLength(clicksBefore);
      expect(selections).toHaveLength(selectionsBefore);
    },
  );
});

test('setSelection replaces the selection and clearSelection empties it', async () => {
  const selections: SelectedNode[][] = [];
  await withChart(
    base({
      selection: { enabled: true, mode: 'multiple' },
      listeners: { selectionChange: (event) => selections.push(event.items) },
    }),
    async (chart) => {
      chart.setSelection([{ datumIndex: 0 }, { datumIndex: 2 }]);
      expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([0, 2]);
      expect(selections.at(-1)).toHaveLength(2);

      chart.setSelection([{ datumIndex: 1 }]);
      expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([1]);

      chart.clearSelection();
      expect(chart.getSelection()).toEqual([]);
      expect(selections.at(-1)).toEqual([]);
    },
  );
});

test('zoomTo and zoomToCount move the window, resetZoom brings it back', async () => {
  const windows: ZoomWindow[] = [];
  await withChart(base({ zoom: { enabled: true }, listeners: { zoomChange: (event) => windows.push(event.x) } }), async (chart) => {
    expect(chart.isZoomed()).toBe(false);

    chart.zoomTo({ x: [0.5, 1] });
    await chart.waitForUpdate();
    expect(chart.isZoomed()).toBe(true);
    expect(chart.getState().zoom?.x).toEqual([0.5, 1]);
    expect(windows.at(-1)).toEqual([0.5, 1]);

    // 1 of 4 items, anchored to the end of the domain
    chart.zoomToCount(1, { anchor: 'end' });
    await chart.waitForUpdate();
    expect(chart.getState().zoom?.x).toEqual([0.75, 1]);

    const emitted = windows.length;
    chart.resetZoom({ silent: true });
    await chart.waitForUpdate();
    expect(chart.isZoomed()).toBe(false);
    expect(windows).toHaveLength(emitted);
  });
});

test('an out-of-range window is clamped instead of breaking the scales', async () => {
  await withChart(base({ zoom: { enabled: true } }), async (chart) => {
    chart.zoomTo({ x: [0.8, 0.2] });
    await chart.waitForUpdate();
    expect(chart.getState().zoom?.x).toEqual([0.2, 0.8]);

    chart.zoomTo({ x: [-1, 5] });
    await chart.waitForUpdate();
    expect(chart.isZoomed()).toBe(false);
  });
});

test('a pie chart drives its tooltip and selection but warns off the zoom', async () => {
  const warnings: unknown[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => void warnings.push(args[0]);
  try {
    await withChart(
      {
        data,
        series: [{ type: 'pie', angleField: 'value', labelField: 'month' }],
        selection: { enabled: true },
        tooltip: {},
        animation: { enabled: false },
        width: 480,
        height: 300,
      },
      async (chart, container) => {
        expect(chart.showTooltip({ datumIndex: 1 })).toBe(true);
        await chart.waitForUpdate();
        expect(tooltipText(container)).toContain('Feb');

        expect(chart.clickNode({ datumIndex: 1 })).toBe(true);
        expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([1]);

        chart.zoomTo({ x: [0, 0.5] });
        expect(warnings.some((message) => String(message).includes('zoomTo'))).toBe(true);
      },
    );
  } finally {
    console.warn = original;
  }
});

/** A click where a pointer would put it: container-relative coordinates. */
function clickAt(container: HTMLElement, x: number, y: number): void {
  const rect = container.getBoundingClientRect();
  const init = { clientX: rect.left + x, clientY: rect.top + y, bubbles: true, pointerId: 1 };
  container.dispatchEvent(new PointerEvent('pointerdown', init));
  container.dispatchEvent(new PointerEvent('pointerup', init));
}

test('a legend click switches one group of a grouped histogram off', async () => {
  const rows = [
    { duration: 2, plan: 'Free' },
    { duration: 4, plan: 'Free' },
    { duration: 12, plan: 'Free' },
    { duration: 6, plan: 'Pro' },
    { duration: 16, plan: 'Pro' },
  ];
  const clicks: Array<{ seriesId: string; visible: boolean }> = [];
  await withChart(
    {
      data: rows,
      series: [{ type: 'histogram', xField: 'duration', groupField: 'plan', binWidth: 10 }],
      animation: { enabled: false },
      width: 480,
      height: 300,
      listeners: { legendItemClick: (event) => void clicks.push(event) },
    },
    async (chart, container) => {
      // the legend sits along the bottom; sweep it until an item answers
      for (let y = 270; y < 300 && clicks.length === 0; y += 4) {
        for (let x = 0; x < 480 && clicks.length === 0; x += 4) clickAt(container, x, y);
      }
      await chart.waitForUpdate();
      // group items are addressed as "<seriesId>#<index>" — the series itself stays visible
      expect(clicks).toHaveLength(1);
      expect(clicks[0]!.seriesId).toMatch(/#\d+$/);
      expect(clicks[0]!.visible).toBe(false);
    },
  );
});
