/**
 * The imperative API in a real browser: the tooltip is a DOM node, the
 * selection and the zoom are chart state, and every call runs the same path
 * a pointer would. Not a screenshot test — it asserts on the DOM and the state.
 */
import type { ChartInstance, ChartOptions, NodeClickEvent, SelectedNode, ZoomWindow } from 'grafit-charts';
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

test('a legend filter outlives the update that rebuilds the series', async () => {
  const rows = [
    { duration: 2, plan: 'Free' },
    { duration: 4, plan: 'Free' },
    { duration: 12, plan: 'Free' },
    { duration: 6, plan: 'Pro' },
    { duration: 16, plan: 'Pro' },
  ];
  const clicks: Array<{ seriesId: string; visible: boolean }> = [];
  const options: ChartOptions = {
    data: rows,
    series: [{ type: 'histogram', xField: 'duration', groupField: 'plan', binWidth: 10 }],
    animation: { enabled: false },
    width: 480,
    height: 300,
    listeners: { legendItemClick: (event) => void clicks.push(event) },
  };
  await withChart(options, async (chart, container) => {
    let spot: { x: number; y: number } | undefined;
    for (let y = 270; y < 300 && !spot; y += 4) {
      for (let x = 0; x < 480 && !spot; x += 4) {
        clickAt(container, x, y);
        if (clicks.length > 0) spot = { x, y };
      }
    }
    await chart.waitForUpdate();
    const hidden = clicks[0]!.seriesId;
    expect(chart.getState().hiddenSeries).toContain(hidden);

    // the same options again: series are rebuilt from scratch, the filter is not
    await chart.update({ ...options, container });
    await chart.waitForUpdate();
    expect(chart.getState().hiddenSeries).toContain(hidden);

    // clicking the item again turns it back on — proof the rebuilt series knew it was off
    clickAt(container, spot!.x, spot!.y);
    await chart.waitForUpdate();
    expect(clicks.at(-1)).toEqual({ seriesId: hidden, visible: true });
    expect(chart.getState().hiddenSeries).not.toContain(hidden);
  });
});

test('a histogram click reports the bin, not whichever row shares its index', async () => {
  const rows = [
    { duration: 2, plan: 'Free' },
    { duration: 4, plan: 'Free' },
    { duration: 12, plan: 'Free' },
    { duration: 6, plan: 'Pro' },
    { duration: 16, plan: 'Pro' },
  ];
  const clicked: NodeClickEvent[] = [];
  await withChart(
    {
      data: rows,
      series: [{ type: 'histogram', xField: 'duration', groupField: 'plan', binWidth: 10 }],
      selection: { enabled: true },
      animation: { enabled: false },
      width: 480,
      height: 300,
      listeners: { nodeClick: (event) => void clicked.push(event) },
    },
    async (chart) => {
      // bar #1 is the 'Pro' share of bin 0–10: the single row at 6
      expect(chart.clickNode({ datumIndex: 1 })).toBe(true);
      expect(clicked).toHaveLength(1);
      expect(clicked[0]!.datum).toBeUndefined();
      expect(clicked[0]!.node).toEqual({ kind: 'bin', x0: 0, x1: 10, value: 1, raw: 1, count: 1, group: 'Pro' });
      // the selection speaks the same language
      expect(chart.getSelection()[0]!.node).toEqual(clicked[0]!.node);
    },
  );
});

test('a bar chart still reports the data row it was always about', async () => {
  const clicked: NodeClickEvent[] = [];
  await withChart(base({ listeners: { nodeClick: (event) => void clicked.push(event) } }), async (chart) => {
    expect(chart.clickNode({ datumIndex: 2 })).toBe(true);
    expect(clicked[0]!.datum).toEqual({ month: 'Mar', value: 20 });
    expect(clicked[0]!.node).toBeUndefined();
  });
});

test('a pyramid selects its layers the way a pie selects its sectors', async () => {
  const rows = [
    { level: 'Managers', people: 40 },
    { level: 'Engineers', people: 120 },
    { level: 'Interns', people: 30 },
  ];
  const clicked: NodeClickEvent[] = [];
  const changes: SelectedNode[][] = [];
  await withChart(
    {
      data: rows,
      series: [{ type: 'pyramid', stageField: 'level', valueField: 'people' }],
      selection: { enabled: true, mode: 'multiple' },
      animation: { enabled: false },
      width: 480,
      height: 300,
      listeners: {
        nodeClick: (event) => void clicked.push(event),
        selectionChange: ({ items }) => void changes.push(items),
      },
    },
    async (chart) => {
      expect(chart.clickNode({ datumIndex: 1 })).toBe(true);
      expect(clicked[0]!.datum).toEqual({ level: 'Engineers', people: 120 });
      expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([1]);

      chart.clickNode({ datumIndex: 2 });
      expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([1, 2]);
      // clicking a selected layer again lets it go (multiple mode)
      chart.clickNode({ datumIndex: 2 });
      expect(chart.getSelection().map((item) => item.datumIndex)).toEqual([1]);
      expect(changes).toHaveLength(3);

      chart.clearSelection();
      expect(chart.getSelection()).toEqual([]);
    },
  );
});
