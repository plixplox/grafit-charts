/**
 * The update transition in a real browser: new data flows into place instead of
 * replacing what is drawn. Mostly not a screenshot test — it asserts on what the
 * chart says while it moves, and on how long it says it is moving for. One
 * screenshot is taken, of a frame pinned to a factor by driving rAF by hand.
 */
import type { ChartInstance, ChartOptions } from 'grafit-charts';
import { Charts } from 'grafit-charts';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';

const WIDTH = 480;
const HEIGHT = 300;

const before = [
  { month: 'Jan', value: 10 },
  { month: 'Feb', value: 30 },
  { month: 'Mar', value: 20 },
];
const after = [
  { month: 'Jan', value: 50 },
  { month: 'Feb', value: 60 },
  { month: 'Mar', value: 70 },
];

/** Long enough that a couple of frames land nowhere near the end of it. */
const SLOW = 4000;

function base(extra?: Partial<ChartOptions>): ChartOptions {
  return {
    data: before,
    series: [{ type: 'bar', xField: 'month', yField: 'value' }],
    tooltip: {},
    width: WIDTH,
    height: HEIGHT,
    // the entrance is not what is under test, and it would run first
    animation: { enabled: false },
    ...extra,
  };
}

async function withChart(options: ChartOptions, body: (chart: ChartInstance, container: HTMLElement) => Promise<void>): Promise<void> {
  const container = document.createElement('div');
  Object.assign(container.style, { width: `${WIDTH}px`, height: `${HEIGHT}px` });
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

/** The number the tooltip of a bar prints. */
function tooltipValue(container: HTMLElement): number {
  return Number((tooltipText(container) ?? '').replace(/[^\d.-]/g, '').trim());
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** A couple of frames in: far enough for the data to have moved, nowhere near arrived. */
async function midway(): Promise<void> {
  await nextFrame();
  await nextFrame();
}

test('the rows walk to their new values, and waitForUpdate waits for them to arrive', async () => {
  const options = base({ animation: { enabled: false, updateEnabled: true, updateDuration: SLOW } });
  await withChart(options, async (chart, container) => {
    chart.showTooltip({ datumIndex: 2 });
    await nextFrame();
    expect(tooltipValue(container)).toBe(20);

    const settled = chart.update({ ...options, data: after });
    await midway();
    const seen = tooltipValue(container);
    expect(seen).toBeGreaterThan(20);
    expect(seen).toBeLessThan(70);

    await settled;
    expect(tooltipValue(container)).toBe(70);
  });
});

test('a tooltip already open keeps its bar and follows it to the new value', async () => {
  const options = base({ animation: { enabled: false, updateEnabled: true, updateDuration: SLOW } });
  await withChart(options, async (chart, container) => {
    chart.showTooltip({ datumIndex: 1 });
    await nextFrame();
    expect(tooltipText(container)).toContain('Feb');

    void chart.update({ ...options, data: after });
    await midway();
    // the series are built once per update rather than once per frame, so the
    // highlight is not wiped sixty times a second on the way
    expect(tooltipText(container)).toContain('Feb');
    expect(tooltipValue(container)).toBeGreaterThan(30);
  });
});

test('updateEnabled off puts the new data on screen at once', async () => {
  const options = base({ animation: { enabled: false, updateEnabled: false } });
  await withChart(options, async (chart, container) => {
    chart.showTooltip({ datumIndex: 2 });
    await nextFrame();

    void chart.update({ ...options, data: after });
    await midway();
    expect(tooltipValue(container)).toBe(70);
  });
});

test('without a key a change in the number of rows is drawn at once', async () => {
  const options = base({ animation: { enabled: false, updateEnabled: true, updateDuration: SLOW } });
  await withChart(options, async (chart, container) => {
    chart.showTooltip({ datumIndex: 1 });
    await nextFrame();

    void chart.update({ ...options, data: after.slice(0, 2) });
    await midway();
    expect(tooltipValue(container)).toBe(60);
  });
});

test('with a key the rows that stayed keep flowing however many arrived or left', async () => {
  const options = base({ animation: { enabled: false, updateEnabled: true, updateDuration: SLOW, key: 'month' } });
  await withChart(options, async (chart, container) => {
    chart.showTooltip({ datumIndex: 1 });
    await nextFrame();
    expect(tooltipValue(container)).toBe(30);

    void chart.update({ ...options, data: after.slice(0, 2) });
    await midway();
    const seen = tooltipValue(container);
    expect(seen).toBeGreaterThan(30);
    expect(seen).toBeLessThan(60);
  });
});

test('an update arriving mid-flight carries on from what is on screen', async () => {
  const options = base({ animation: { enabled: false, updateEnabled: true, updateDuration: SLOW } });
  await withChart(options, async (chart, container) => {
    chart.showTooltip({ datumIndex: 2 });
    await nextFrame();

    void chart.update({ ...options, data: after });
    await midway();
    const interrupted = tooltipValue(container);

    void chart.update({ ...options, data: before });
    await nextFrame();
    // back towards 20 from where it stood, not from the 70 it never reached
    expect(tooltipValue(container)).toBeLessThan(interrupted + 1);
    expect(tooltipValue(container)).toBeGreaterThan(19);
  });
});

/**
 * rAF driven by hand, with the clock pinned: the animator reads the start off
 * performance.now() and the factor off the timestamp it is handed, so both have
 * to be ours for a frame to land on an exact factor.
 */
function pinnedFrames() {
  const pending = new Map<number, FrameRequestCallback>();
  const raf = window.requestAnimationFrame;
  const cancel = window.cancelAnimationFrame;
  let id = 0;
  window.requestAnimationFrame = (frame: FrameRequestCallback) => {
    pending.set(++id, frame);
    return id;
  };
  window.cancelAnimationFrame = (key: number) => {
    pending.delete(key);
  };
  vi.spyOn(performance, 'now').mockReturnValue(0);
  return {
    /** Runs everything waiting at this timestamp; twice, so the render the frame asks for lands too. */
    flush(timestamp: number) {
      for (let pass = 0; pass < 2; pass += 1) {
        const batch = [...pending.values()];
        pending.clear();
        for (const frame of batch) frame(timestamp);
      }
    },
    restore() {
      window.requestAnimationFrame = raf;
      window.cancelAnimationFrame = cancel;
      vi.mocked(performance.now).mockRestore();
    },
  };
}

test('a category leaving closes its band while another opens one, pinned', async () => {
  const container = document.createElement('div');
  Object.assign(container.style, { width: `${WIDTH}px`, height: `${HEIGHT}px` });
  document.body.appendChild(container);
  const options = base({ animation: { enabled: false, updateEnabled: true, updateDuration: 1000, key: 'month' } });
  const chart = Charts.create({ ...options, container });
  await chart.waitForUpdate();

  const frames = pinnedFrames();
  try {
    // Mar leaves, Apr arrives, the other two stay
    void chart.update({ ...options, data: [...after.slice(0, 2), { month: 'Apr', value: 40 }] });
    frames.flush(500);
    await expect(page.elementLocator(container)).toMatchScreenshot('bar-update-bands');
  } finally {
    frames.restore();
    chart.destroy();
    container.remove();
  }
});

test('the first frame of an update stands where the old data left off, pinned', async () => {
  const container = document.createElement('div');
  Object.assign(container.style, { width: `${WIDTH}px`, height: `${HEIGHT}px` });
  document.body.appendChild(container);
  // an order of magnitude apart: the scale it walks to is nothing like the one it leaves
  const small = [
    { month: 'Jan', value: 12_000 },
    { month: 'Feb', value: 34_000 },
    { month: 'Mar', value: 21_000 },
  ];
  const large = small.map((row) => ({ ...row, value: row.value * 12 }));
  const options = base({ data: small, animation: { enabled: false, updateEnabled: true, updateDuration: 1000 } });
  const chart = Charts.create({ ...options, container });
  await chart.waitForUpdate();

  const frames = pinnedFrames();
  try {
    void chart.update({ ...options, data: large });
    // the very start of the walk: the bars are still the small ones, at the
    // height the axis they were drawn against gave them
    frames.flush(0);
    await expect(page.elementLocator(container)).toMatchScreenshot('bar-update-start');
  } finally {
    frames.restore();
    chart.destroy();
    container.remove();
  }
});

test('a frame partway through an update, pinned to its factor', async () => {
  const container = document.createElement('div');
  Object.assign(container.style, { width: `${WIDTH}px`, height: `${HEIGHT}px` });
  document.body.appendChild(container);
  const options = base({ animation: { enabled: false, updateEnabled: true, updateDuration: 1000 } });
  const chart = Charts.create({ ...options, container });
  await chart.waitForUpdate();

  const frames = pinnedFrames();
  try {
    void chart.update({ ...options, data: after });
    // half the duration in; eased, the bars stand at 0.875 of the way there
    frames.flush(500);
    await expect(page.elementLocator(container)).toMatchScreenshot('bar-update-midway');
  } finally {
    frames.restore();
    chart.destroy();
    container.remove();
  }
});
