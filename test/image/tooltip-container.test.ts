/**
 * tooltip.container in a real browser: the tooltip either stays inside the
 * chart container, or leaves it for the body (or an app's layer) and is placed
 * against the viewport, where the chart's clipping ancestors can't cut it.
 */
import type { ChartInstance, ChartOptions, TooltipOptions } from 'grafit-charts';
import { Charts } from 'grafit-charts';
import { expect, test } from 'vitest';

const data = [
  { month: 'Jan', value: 10 },
  { month: 'Feb', value: 30 },
  { month: 'Mar', value: 20 },
  { month: 'Apr', value: 45 },
];

interface Box {
  left: string;
  top: string;
  width: number;
  height: number;
}

/**
 * A KPI-sized area chart in a tile that clips its content — the case the option
 * is for: the tooltip is taller than the chart and has to get out of the tile.
 */
async function withTile(
  tooltip: TooltipOptions,
  body: (chart: ChartInstance, container: HTMLElement) => Promise<void>,
  box: Box = { left: '100px', top: '200px', width: 160, height: 40 },
): Promise<void> {
  const tile = document.createElement('div');
  Object.assign(tile.style, { position: 'absolute', left: box.left, top: box.top, overflow: 'hidden' });
  const container = document.createElement('div');
  Object.assign(container.style, { width: `${box.width}px`, height: `${box.height}px` });
  tile.appendChild(container);
  document.body.appendChild(tile);
  const options: ChartOptions = {
    data,
    series: [{ type: 'area', xField: 'month', yField: 'value' }],
    axes: [
      { type: 'category', position: 'bottom', label: { enabled: false } },
      { type: 'number', position: 'left', label: { enabled: false } },
    ],
    legend: { enabled: false },
    padding: { top: 2, right: 2, bottom: 2, left: 2 },
    animation: { enabled: false },
    width: box.width,
    height: box.height,
    tooltip,
    container,
  };
  const chart = Charts.create(options);
  try {
    await chart.waitForUpdate();
    await body(chart, container);
  } finally {
    chart.destroy();
    tile.remove();
  }
}

/** The tooltip is the pointer-transparent div under a parent. */
function tooltipIn(parent: HTMLElement): HTMLDivElement | undefined {
  return [...parent.children].find((node): node is HTMLDivElement => node instanceof HTMLDivElement && node.style.pointerEvents === 'none');
}

test('by default the tooltip stays inside the chart container', async () => {
  await withTile({}, async (chart, container) => {
    expect(chart.showTooltip({ datumIndex: 3 })).toBe(true);
    await chart.waitForUpdate();
    const element = tooltipIn(container);
    expect(element?.style.position).toBe('absolute');
    expect(element?.textContent).toContain('45');
    expect(tooltipIn(document.body)).toBeUndefined();
  });
});

test("container: 'body' lets the tooltip out of a clipping tile and takes it away on destroy", async () => {
  let element: HTMLDivElement | undefined;
  await withTile({ container: 'body' }, async (chart, container) => {
    expect(chart.showTooltip({ datumIndex: 3 })).toBe(true);
    await chart.waitForUpdate();
    element = tooltipIn(document.body);
    expect(element).toBeDefined();
    expect(tooltipIn(container)).toBeUndefined();
    expect(element!.style.position).toBe('fixed');
    expect(element!.style.display).toBe('block');
    expect(element!.textContent).toContain('Apr');

    const tooltipRect = element!.getBoundingClientRect();
    const chartRect = container.getBoundingClientRect();
    // taller than the chart, so it can only be whole by reaching past its edges
    expect(tooltipRect.height).toBeGreaterThan(chartRect.height);
    expect(tooltipRect.top < chartRect.top || tooltipRect.bottom > chartRect.bottom).toBe(true);
    expect(tooltipRect.top).toBeGreaterThanOrEqual(0);
    expect(tooltipRect.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });
  expect(element?.isConnected).toBe(false);
});

/** Whether two boxes share any area. */
function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

test('on a tall chart a node near its top gets the tooltip over the chart, one in the middle keeps it beside', async () => {
  await withTile(
    { container: 'body' },
    async (chart, container) => {
      const chartRect = container.getBoundingClientRect();

      // Apr is the top of the data, a few pixels under the chart's edge
      chart.showTooltip({ datumIndex: 3 });
      await chart.waitForUpdate();
      const nearTop = tooltipIn(document.body)!.getBoundingClientRect();
      expect(nearTop.bottom).toBeLessThanOrEqual(chartRect.top);
      expect(chartRect.top - nearTop.bottom).toBeLessThan(nearTop.height);

      // Mar sits well inside: the tooltip stays by the node, over the chart as ever
      chart.showTooltip({ datumIndex: 2 });
      await chart.waitForUpdate();
      const inside = tooltipIn(document.body)!.getBoundingClientRect();
      expect(inside.top).toBeGreaterThan(chartRect.top);
      expect(inside.bottom).toBeLessThan(chartRect.bottom);
    },
    { left: '100px', top: '150px', width: 480, height: 300 },
  );
});

test('a chart too short for the tooltip gets it over the chart, never on it', async () => {
  await withTile({ container: 'body' }, async (chart, container) => {
    // the lowest point: just above it is still the strip itself
    chart.showTooltip({ datumIndex: 0 });
    await chart.waitForUpdate();
    const tooltipRect = tooltipIn(document.body)!.getBoundingClientRect();
    const chartRect = container.getBoundingClientRect();
    expect(overlaps(tooltipRect, chartRect)).toBe(false);
    expect(tooltipRect.bottom).toBeLessThanOrEqual(chartRect.top);
  });
});

test('with no room over a short chart the tooltip goes under it, not across it', async () => {
  // a KPI card in the top-right corner of the page — where the tooltip beside a node flipped onto the chart
  const viewport = document.documentElement.clientWidth;
  await withTile(
    { container: 'body' },
    async (chart, container) => {
      chart.showTooltip({ datumIndex: 3 });
      await chart.waitForUpdate();
      const tooltipRect = tooltipIn(document.body)!.getBoundingClientRect();
      const chartRect = container.getBoundingClientRect();
      expect(overlaps(tooltipRect, chartRect)).toBe(false);
      expect(tooltipRect.top).toBeGreaterThanOrEqual(chartRect.bottom);
    },
    { left: `${viewport - 160}px`, top: '4px', width: 160, height: 40 },
  );
});

test('scrolling hides a tooltip placed against the viewport', async () => {
  await withTile({ container: 'body' }, async (chart) => {
    chart.showTooltip({ datumIndex: 1 });
    await chart.waitForUpdate();
    expect(tooltipIn(document.body)?.style.display).toBe('block');
    window.dispatchEvent(new Event('scroll'));
    expect(tooltipIn(document.body)?.style.display).toBe('none');
  });
});

test('an element as the container takes the tooltip into that layer', async () => {
  const layer = document.createElement('div');
  document.body.appendChild(layer);
  try {
    await withTile({ container: layer, zIndex: 50 }, async (chart) => {
      chart.showTooltip({ datumIndex: 2 });
      await chart.waitForUpdate();
      const element = tooltipIn(layer);
      expect(element?.style.position).toBe('fixed');
      expect(element?.style.zIndex).toBe('50');
      expect(element?.textContent).toContain('Mar');
    });
    expect(tooltipIn(layer)).toBeUndefined();
  } finally {
    layer.remove();
  }
});

test('outside the chart the tooltip is kept within the viewport, not the container', async () => {
  // the chart's right edge touches the viewport's, and the last point sits on it
  const viewport = document.documentElement.clientWidth;
  await withTile(
    { container: 'body' },
    async (chart) => {
      chart.showTooltip({ datumIndex: 3 });
      await chart.waitForUpdate();
      const rect = tooltipIn(document.body)!.getBoundingClientRect();
      expect(rect.right).toBeLessThanOrEqual(viewport);
      expect(rect.left).toBeGreaterThanOrEqual(0);
    },
    { left: `${viewport - 160}px`, top: '200px', width: 160, height: 40 },
  );
});
