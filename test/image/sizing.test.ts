/**
 * What size the canvas comes out at. The floor under a measured container is
 * 300×200 by default; `minWidth`/`minHeight` move it, `0` takes it away, and
 * `responsive` says who does the measuring — the container or the options.
 *
 * Not a screenshot test: it asserts on the canvas element the chart put in the
 * container, which is the size everything else is laid out against.
 */
import type { ChartInstance, ChartOptions } from 'grafit-charts';
import { Charts } from 'grafit-charts';
import { expect, test, vi } from 'vitest';

const data = [
  { month: 'Jan', value: 10 },
  { month: 'Feb', value: 30 },
  { month: 'Mar', value: 20 },
];

const series: ChartOptions['series'] = [{ type: 'bar', xField: 'month', yField: 'value' }];

/** Logical size of the scene canvas — the CSS px the chart laid itself out in. */
function canvasSize(container: HTMLElement): [number, number] {
  const canvas = container.querySelector('canvas');
  if (!canvas) return [0, 0];
  return [parseFloat(canvas.style.width), parseFloat(canvas.style.height)];
}

async function withChart(
  containerStyle: Partial<CSSStyleDeclaration>,
  options: Partial<ChartOptions>,
  body: (chart: ChartInstance, container: HTMLElement) => Promise<void>,
): Promise<void> {
  const container = document.createElement('div');
  Object.assign(container.style, containerStyle);
  document.body.appendChild(container);
  const chart = Charts.create({ data, series, animation: { enabled: false }, ...options, container });
  try {
    await chart.waitForUpdate();
    await body(chart, container);
  } finally {
    chart.destroy();
    container.remove();
  }
}

/** A ResizeObserver callback lands a frame later; two rAFs are enough to see it. */
function nextResize(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

test('a container smaller than the default floor gets a canvas at the floor', async () => {
  await withChart({ width: '160px', height: '120px' }, {}, async (_chart, container) => {
    expect(canvasSize(container)).toEqual([300, 200]);
  });
});

test('minWidth/minHeight move the floor, and 0 takes it away', async () => {
  await withChart({ width: '195px', height: '140px' }, { minWidth: 120, minHeight: 80 }, async (_chart, container) => {
    expect(canvasSize(container)).toEqual([195, 140]);
  });
  await withChart({ width: '90px', height: '40px' }, { minWidth: 0, minHeight: 0 }, async (_chart, container) => {
    expect(canvasSize(container)).toEqual([90, 40]);
  });
  // the floor is still a floor: below it the container loses
  await withChart({ width: '90px', height: '40px' }, { minWidth: 120, minHeight: 80 }, async (_chart, container) => {
    expect(canvasSize(container)).toEqual([120, 80]);
  });
});

test('a numeric width/height ignores the floor and the container alike', async () => {
  await withChart({ width: '600px', height: '400px' }, { width: 90, height: 40 }, async (_chart, container) => {
    expect(canvasSize(container)).toEqual([90, 40]);
  });
});

test('the floor follows an update that changes it', async () => {
  await withChart({ width: '195px', height: '140px' }, {}, async (chart, container) => {
    expect(canvasSize(container)).toEqual([300, 200]);
    await chart.update({ data, series, animation: { enabled: false }, minWidth: 0, minHeight: 0 });
    expect(canvasSize(container)).toEqual([195, 140]);
    await chart.updateDelta({ minWidth: 400, minHeight: 300 });
    expect(canvasSize(container)).toEqual([400, 300]);
  });
});

test('responsive: true keeps the observer, and width/height are only where it starts', async () => {
  const container = document.createElement('div');
  Object.assign(container.style, { display: 'none', width: '240px', height: '160px' });
  document.body.appendChild(container);
  const chart = Charts.create({
    data,
    series,
    animation: { enabled: false },
    responsive: true,
    minWidth: 0,
    minHeight: 0,
    width: 320,
    height: 180,
    container,
  });
  try {
    await chart.waitForUpdate();
    // no box to measure: the numbers stood in for it
    expect(canvasSize(container)).toEqual([320, 180]);
    container.style.display = 'block';
    await nextResize();
    // shown, the container has the say — and it is under the old floor
    expect(canvasSize(container)).toEqual([240, 160]);
  } finally {
    chart.destroy();
    container.remove();
  }
});

test('responsive: false measures once and stops following the container', async () => {
  const container = document.createElement('div');
  Object.assign(container.style, { width: '480px', height: '300px' });
  document.body.appendChild(container);
  const chart = Charts.create({ data, series, animation: { enabled: false }, responsive: false, container });
  try {
    await chart.waitForUpdate();
    expect(canvasSize(container)).toEqual([480, 300]);
    container.style.width = '600px';
    await nextResize();
    expect(canvasSize(container)).toEqual([480, 300]);
  } finally {
    chart.destroy();
    container.remove();
  }
});

test('a container with no box waits for one instead of laying out at zero', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const container = document.createElement('div');
  container.style.display = 'none';
  document.body.appendChild(container);
  const chart = Charts.create({ data, series, animation: { enabled: false }, minWidth: 0, minHeight: 0, container });
  try {
    await chart.waitForUpdate();
    expect(canvasSize(container)).toEqual([0, 0]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('container has no size'));
    Object.assign(container.style, { display: 'block', width: '260px', height: '150px' });
    await nextResize();
    expect(canvasSize(container)).toEqual([260, 150]);
    // the chart drew itself once the box arrived: a node is there to point at
    expect(chart.showTooltip({ datumIndex: 1 })).toBe(true);
  } finally {
    vi.restoreAllMocks();
    chart.destroy();
    container.remove();
  }
});

test('a chart whose container is hidden keeps the layout it comes back to', async () => {
  await withChart({ width: '360px', height: '240px' }, { minWidth: 0, minHeight: 0 }, async (chart, container) => {
    expect(canvasSize(container)).toEqual([360, 240]);
    container.style.display = 'none';
    await nextResize();
    expect(canvasSize(container)).toEqual([360, 240]);
    container.style.display = 'block';
    await nextResize();
    expect(canvasSize(container)).toEqual([360, 240]);
    expect(chart.showTooltip({ datumIndex: 1 })).toBe(true);
  });
});
