import type { ChartOptions } from 'grafit-charts';
import { Charts } from 'grafit-charts';
import { expect, test } from 'vitest';

const base = (family: string, fonts?: ChartOptions['fonts']): ChartOptions => ({
  data: [
    { x: 'Alpha', y: 10 },
    { x: 'Bravo', y: 30 },
  ],
  series: [{ type: 'bar', xField: 'x', yField: 'y' }],
  theme: { params: { fontFamily: family } },
  animation: { enabled: false },
  width: 400,
  height: 240,
  fonts,
});

async function withChart(options: ChartOptions, body: (chart: ReturnType<typeof Charts.create>) => Promise<void>): Promise<void> {
  const container = document.createElement('div');
  Object.assign(container.style, { width: '400px', height: '240px' });
  document.body.appendChild(container);
  const chart = Charts.create({ ...options, container });
  try {
    await chart.waitForUpdate();
    await body(chart);
  } finally {
    chart.destroy();
    container.remove();
  }
}

/** Adds a face to the document after the chart was built and waits for the event. */
async function addFaceLate(family: string): Promise<void> {
  // local() keeps the test free of a binary: the source is a system face,
  // the point is that the family appears only after the chart was built
  const face = new FontFace(family, 'local("Courier New"), local("DejaVu Sans Mono"), local("Liberation Mono")');
  document.fonts.add(face);
  await face.load();
  await new Promise((resolve) => setTimeout(resolve, 200));
}

test('redraws when a font declared after the chart lands', async () => {
  await withChart(base('LateProbeA, monospace'), async (chart) => {
    const before = chart.getImageDataURL();
    await addFaceLate('LateProbeA');
    expect(chart.getImageDataURL()).not.toBe(before);
  });
});

test('stays on the first frame with autoReload disabled', async () => {
  await withChart(base('LateProbeB, monospace', { autoReload: false }), async (chart) => {
    const before = chart.getImageDataURL();
    await addFaceLate('LateProbeB');
    expect(chart.getImageDataURL()).toBe(before);
  });
});
