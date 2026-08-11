/**
 * What a chart does when it cannot draw something. A render is called from the
 * animation tick and from a ResizeObserver — outside any try of the caller's —
 * so it must not throw: the series that cannot be drawn is left out, its reason
 * is stated once however many frames follow, and the rest of the chart lives.
 *
 * Not a screenshot test: it asserts on the console and on the chart's own state.
 */
import type { ChartInstance, ChartOptions } from 'grafit-charts';
import { Charts } from 'grafit-charts';
import { afterEach, expect, test, vi } from 'vitest';

const dated = [
  { date: new Date(Date.UTC(2025, 0, 1)), value: 10 },
  { date: new Date(Date.UTC(2025, 0, 2)), value: 30 },
  { date: new Date(Date.UTC(2025, 0, 5)), value: 20 },
];

const named = [
  { month: 'Янв', value: 10 },
  { month: 'Фев', value: 30 },
];

async function withChart(options: ChartOptions, body: (chart: ChartInstance) => Promise<void>): Promise<void> {
  const container = document.createElement('div');
  Object.assign(container.style, { width: '480px', height: '300px' });
  document.body.appendChild(container);
  const chart = Charts.create({ ...options, animation: { enabled: false }, width: 480, height: 300, container });
  try {
    await chart.waitForUpdate();
    await body(chart);
  } finally {
    chart.destroy();
    container.remove();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

test('bars stand on a continuous time axis, where the step of the data sets their width', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  await withChart(
    {
      data: dated,
      series: [{ type: 'bar', xField: 'date', yField: 'value' }],
      axes: [
        { type: 'time', position: 'bottom' },
        { type: 'number', position: 'left' },
      ],
    },
    async (chart) => {
      // a bar was drawn for the datum: the tooltip needs a node on screen
      expect(chart.showTooltip({ datumIndex: 2 })).toBe(true);
      expect(errors).not.toHaveBeenCalled();
    },
  );
});

test('a series that cannot draw is left out, and says why once however often the chart renders', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  await withChart(
    {
      data: named,
      // a value axis of categories: a bar has nothing to measure its height against
      series: [{ type: 'bar', xField: 'month', yField: 'value', label: { enabled: true } }],
      axes: [
        { type: 'category', position: 'bottom' },
        { type: 'category', position: 'left' },
      ],
    },
    async (chart) => {
      expect(errors).toHaveBeenCalledTimes(1);
      expect(String(errors.mock.calls[0]?.[0])).toContain('numeric value axis');
      // the layout ran three passes and the render one more: still one message
      chart.zoomTo({ x: [0, 0.6] });
      await chart.waitForUpdate();
      expect(errors).toHaveBeenCalledTimes(1);
      // and the chart itself is alive
      expect(chart.getOptions().series).toHaveLength(1);
    },
  );
});

test('a time axis whose values are no dates says so instead of drawing an empty plot', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  await withChart(
    {
      data: named,
      series: [{ type: 'line', xField: 'month', yField: 'value' }],
      axes: [
        { type: 'time', position: 'bottom' },
        { type: 'number', position: 'left' },
      ],
    },
    async () => {
      expect(errors).toHaveBeenCalledTimes(1);
      expect(String(errors.mock.calls[0]?.[0])).toContain('not one of them parses as a date');
    },
  );
});

test('dates that do parse leave the axis alone', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  await withChart(
    {
      data: dated,
      series: [{ type: 'line', xField: 'date', yField: 'value' }],
      axes: [
        { type: 'time', position: 'bottom' },
        { type: 'number', position: 'left' },
      ],
    },
    async () => {
      expect(errors).not.toHaveBeenCalled();
    },
  );
});
